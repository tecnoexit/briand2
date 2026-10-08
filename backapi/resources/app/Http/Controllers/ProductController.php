<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query();

        // 0. Filtro por rol según la nueva columna `visibility`:
        //   - 'cliente'      → no ve productos `distribuidor_only`
        //   - 'distribuidor' → no ve productos `regular_only`
        //   - 'admin' / 'vendedor' → ven todo
        $user = $request->user();
        if ($user) {
            if ($user->role === 'cliente') {
                $query->where('visibility', '!=', 'distribuidor_only');
            } elseif ($user->role === 'distribuidor') {
                $query->where('visibility', '!=', 'regular_only');
            }
        }

        // 1. Filtro de búsqueda Inteligente
        if ($request->filled('search')) {
            $search = $request->search;
            
            // Convertimos el string en un array de palabras (ej: "punta pinza" -> ["punta", "pinza"])
            $words = explode(' ', $search);
        
            $query->where(function($q) use ($words) {
                foreach ($words as $word) {
                    // Limpiamos espacios vacíos por si el usuario puso doble espacio
                    if (empty(trim($word))) continue;
        
                    $q->where(function($sub) use ($word) {
                        $sub->where('name', 'like', "%$word%")
                            ->orWhere('code', 'like', "%$word%")
                            ->orWhere('description', 'like', "%$word%");
                    });
                }
            });
        }

        // 2. Filtro por moneda (currency_id). Acepta un ID o varios separados por coma.
        if ($request->filled('currency_id')) {
            $currencyIds = collect(explode(',', (string) $request->currency_id))
                ->map(fn ($v) => (int) trim($v))
                ->filter()
                ->values()
                ->all();
            if (!empty($currencyIds)) {
                $query->whereIn('currency_id', $currencyIds);
            }
        }

        // 2.b Filtro por visibilidad (all | distribuidor_only | regular_only).
        //     Contempla filas legacy donde `visibility` es null y se usa `distribuidor_only`.
        if ($request->filled('visibility')) {
            $vis = $request->visibility;
            if ($vis === 'distribuidor_only') {
                $query->where(function ($q) {
                    $q->where('visibility', 'distribuidor_only')
                      ->orWhere(function ($q2) {
                          $q2->whereNull('visibility')->where('distribuidor_only', true);
                      });
                });
            } elseif ($vis === 'regular_only') {
                $query->where(function ($q) {
                    $q->where('visibility', 'regular_only')
                      ->orWhere(function ($q2) {
                          $q2->whereNull('visibility')->where('distribuidor_only', false);
                      });
                });
            } elseif ($vis === 'all') {
                $query->where('visibility', 'all');
            }
        }

        // 3. Lógica de Ordenamiento
        // Se agrega 'profit_margin' a las columnas permitidas
        $allowedSorts = ['id', 'name', 'code', 'price', 'profit_margin', 'stock', 'updated_at'];
        $sort = $request->get('sort', 'updated_at'); 
        $direction = $request->get('direction', 'desc'); 

        if (in_array($sort, $allowedSorts)) {
            $query->orderBy($sort, $direction === 'asc' ? 'asc' : 'desc');
        }

        // 4. Si se solicita la lista completa
        if ($request->boolean('all')) {
            $products = $query->get();
            
            return response()->json([
                'data'         => $products,
                'total'        => $products->count(),
                'current_page' => 1,
                'last_page'    => 1,
                'per_page'     => $products->count(),
            ]);
        }

        // 5. Paginación normal
        return response()->json($query->paginate(50));
    }
    
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string',
            'description'   => 'nullable|string',
            'code'          => 'required|string|unique:products',
            'precio_lista'  => 'required|numeric|min:0',
            'impuesto'      => 'nullable|numeric',   // porcentaje, ej: 20 para 20% de IVA (puede ser negativo)
            'profit_margin' => 'nullable|numeric|min:0',
            'currency_id'   => 'required|exists:currencies,id',
            'stock'         => 'integer',
            'image'         => 'nullable|string',
            // --- Distribuidor ---
            'distribuidor_discount_enabled' => 'sometimes|boolean',
            'distribuidor_discount_percent' => 'sometimes|numeric|min:0|max:100',
            'distribuidor_only'             => 'sometimes|boolean',
            'visibility'                    => 'sometimes|in:all,distribuidor_only,regular_only',
        ]);

        // precio_costo = precio_lista * (1 + impuesto / 100)
        // Ej: lista=10, impuesto=20% → costo = 10 * 1.20 = 12
        $impuesto        = isset($data['impuesto']) ? (float) $data['impuesto'] : 0.0;
        $data['impuesto'] = $impuesto;
        $data['price']   = round((float) $data['precio_lista'] * (1 + $impuesto / 100), 2);

        // Si el descuento distribuidor está desactivado, forzamos % = 0 para mantener consistencia.
        if (array_key_exists('distribuidor_discount_enabled', $data)
            && $data['distribuidor_discount_enabled'] === false) {
            $data['distribuidor_discount_percent'] = 0;
        }

        // Sincronizar visibility ↔ distribuidor_only para mantener compat:
        //  - Si vino visibility, derivar distribuidor_only desde ahí.
        //  - Si vino distribuidor_only pero no visibility, derivar visibility.
        if (array_key_exists('visibility', $data)) {
            $data['distribuidor_only'] = ($data['visibility'] === 'distribuidor_only');
        } elseif (array_key_exists('distribuidor_only', $data)) {
            $data['visibility'] = $data['distribuidor_only'] ? 'distribuidor_only' : 'all';
        }

        if ($request->filled('image')) {
            $data['image_url'] = $this->uploadBase64Image($request->image);
        }

        return Product::create($data);
    }

    public function update(Request $request, Product $product)
    {
        $data = $request->validate([
            'name'          => 'string',
            'description'   => 'nullable|string',
            'code'          => 'string|unique:products,code,' . $product->id,
            'precio_lista'  => 'numeric|min:0',
            'impuesto'      => 'numeric',   // puede ser negativo (descuento)
            'profit_margin' => 'numeric|min:0',
            'currency_id'   => 'exists:currencies,id',
            'stock'         => 'integer',
            'image'         => 'nullable|string',
            // --- Distribuidor ---
            'distribuidor_discount_enabled' => 'sometimes|boolean',
            'distribuidor_discount_percent' => 'sometimes|numeric|min:0|max:100',
            'distribuidor_only'             => 'sometimes|boolean',
            'visibility'                    => 'sometimes|in:all,distribuidor_only,regular_only',
        ]);

        // Recalcular precio_costo si cambia precio_lista o impuesto
        $precioLista = isset($data['precio_lista'])
            ? (float) $data['precio_lista']
            : (float) $product->precio_lista;

        $impuesto = isset($data['impuesto'])
            ? (float) $data['impuesto']
            : (float) $product->impuesto;

        $data['price'] = round($precioLista * (1 + $impuesto / 100), 2);

        // Si se desactiva el descuento, dejamos % en 0 para mantener consistencia.
        if (array_key_exists('distribuidor_discount_enabled', $data)
            && $data['distribuidor_discount_enabled'] === false) {
            $data['distribuidor_discount_percent'] = 0;
        }

        // Sincronizar visibility ↔ distribuidor_only (mismo criterio que en store)
        if (array_key_exists('visibility', $data)) {
            $data['distribuidor_only'] = ($data['visibility'] === 'distribuidor_only');
        } elseif (array_key_exists('distribuidor_only', $data)) {
            $data['visibility'] = $data['distribuidor_only'] ? 'distribuidor_only' : 'all';
        }

        if ($request->filled('image')) {
            if ($product->image_url) {
                $oldPath = str_replace('/storage/', 'public/', $product->image_url);
                Storage::delete($oldPath);
            }
            $data['image_url'] = $this->uploadBase64Image($request->image);
        }

        $product->update($data);
        return $product;
    }

    /**
     * Procesa el string Base64 y lo guarda en el storage.
     */
    // private function uploadBase64Image($base64String)
    // {
    //     $extension = explode('/', explode(':', substr($base64String, 0, strpos($base64String, ';')))[1])[1];
        
    //     $replace = substr($base64String, 0, strpos($base64String, ',') + 1);
    //     $image = str_replace($replace, '', $base64String);
    //     $image = str_replace(' ', '+', $image);
        
    //     $imageName = 'product_' . Str::random(10) . '.' . $extension;
    //     Storage::disk('public')->put('products/' . $imageName, base64_decode($image));

    //     return Storage::url('products/' . $imageName);
    // }
    
    private function uploadBase64Image($base64String)
    {
        $extension = explode('/', explode(':', substr($base64String, 0, strpos($base64String, ';')))[1])[1];
        
        $replace = substr($base64String, 0, strpos($base64String, ',') + 1);
        $image = str_replace($replace, '', $base64String);
        $image = str_replace(' ', '+', $image);
        
        $imageName = 'product_' . Str::random(10) . '.' . $extension;
        $path = 'products/' . $imageName;
        
        Storage::disk('public')->put($path, base64_decode($image));
        return '/storage/' . $path;
    }

    public function bulkUpdate(Request $request)
    {
        $request->validate(['items' => 'required|array']);

        foreach ($request->items as $item) {
            // Extraemos solo los campos permitidos para evitar actualizaciones accidentales de IDs o fechas
            $updateData = collect($item)->only([
                'name',
                'description',
                'code',
                'precio_lista',
                'impuesto',
                'profit_margin',
                'currency_id',
                'stock',
                // --- Distribuidor ---
                'distribuidor_discount_enabled',
                'distribuidor_discount_percent',
                'distribuidor_only',
                'visibility',
            ])->toArray();

            // Normalizar tipos para evitar "true"/"false" como strings en mass-edit
            if (array_key_exists('distribuidor_discount_enabled', $updateData)) {
                $updateData['distribuidor_discount_enabled'] = (bool) $updateData['distribuidor_discount_enabled'];
                // Si se apaga el check, forzamos % = 0 salvo que venga un % explícito junto.
                if ($updateData['distribuidor_discount_enabled'] === false
                    && !array_key_exists('distribuidor_discount_percent', $updateData)) {
                    $updateData['distribuidor_discount_percent'] = 0;
                }
            }
            if (array_key_exists('distribuidor_only', $updateData)) {
                $updateData['distribuidor_only'] = (bool) $updateData['distribuidor_only'];
            }

            // Sincronizar visibility ↔ distribuidor_only en bulk
            if (array_key_exists('visibility', $updateData)) {
                $vis = $updateData['visibility'];
                if (!in_array($vis, ['all', 'distribuidor_only', 'regular_only'], true)) {
                    $vis = 'all';
                }
                $updateData['visibility']        = $vis;
                $updateData['distribuidor_only'] = ($vis === 'distribuidor_only');
            } elseif (array_key_exists('distribuidor_only', $updateData)) {
                $updateData['visibility'] = $updateData['distribuidor_only']
                    ? 'distribuidor_only'
                    : 'all';
            }
            if (array_key_exists('distribuidor_discount_percent', $updateData)) {
                $pct = (float) $updateData['distribuidor_discount_percent'];
                // Clamp a [0, 100]
                // Clamp a [0, 100]
                $updateData['distribuidor_discount_percent'] = max(0, min(100, $pct));
            }

            // Recalcular precio_costo si se envía precio_lista o impuesto
            if (isset($updateData['precio_lista']) || isset($updateData['impuesto'])) {
                $product = Product::find($item['id']);
                if ($product) {
                    $precioLista = isset($updateData['precio_lista'])
                        ? (float) $updateData['precio_lista']
                        : (float) $product->precio_lista;
                    $impuesto = isset($updateData['impuesto'])
                        ? (float) $updateData['impuesto']
                        : (float) $product->impuesto;
                    $updateData['price'] = round($precioLista * (1 + $impuesto / 100), 2);
                }
            }

            Product::where('id', $item['id'])->update($updateData);
        }

        return response()->json(['message' => 'Productos actualizados']);
    }

    public function destroy(Product $product)
    {
        if ($product->image_url) {
            $path = str_replace('/storage/', 'public/', $product->image_url);
            Storage::delete($path);
        }
        $product->delete();
        return response()->json(['message' => 'Producto eliminado']);
    }

    /**
     * Devuelve la imagen del producto como data URL en base64.
     * Esto permite que el frontend la consuma sin problemas de CORS
     * (los archivos estáticos en /storage/* no llevan headers CORS,
     *  pero las rutas /api/* sí, porque pasan por el middleware
     *  HandleCors de Laravel).
     */
    public function imageBase64(Product $product)
    {
        if (!$product->image_url) {
            return response()->json(['data_url' => null, 'mime' => null]);
        }

        // image_url se guarda como "/storage/products/xxx.jpg".
        // En el disco 'public' (storage/app/public) se accede sin "/storage/".
        $relativePath = ltrim(str_replace('/storage/', '', $product->image_url), '/');

        if (!Storage::disk('public')->exists($relativePath)) {
            return response()->json(['data_url' => null, 'mime' => null]);
        }

        $contents = Storage::disk('public')->get($relativePath);
        $mime     = Storage::disk('public')->mimeType($relativePath) ?: 'image/jpeg';
        $base64   = base64_encode($contents);

        return response()->json([
            'data_url' => "data:{$mime};base64,{$base64}",
            'mime'     => $mime,
        ]);
    }
}