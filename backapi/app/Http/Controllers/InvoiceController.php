<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    /**
     * Listar facturas. Admin ve todas, vendedor solo las suyas.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['items', 'seller']);

        // Si es vendedor, solo ve sus facturas
        if ($request->user()->role === 'vendedor') {
            $query->where('seller_id', $request->user()->id);
        }

        // Búsqueda general por nombre de cliente o número de factura
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('client_name', 'like', "%{$search}%")
                  ->orWhere('id', 'like', "%{$search}%");
            });
        }

        // Filtro por vendedor (solo admin puede filtrar por vendedor)
        if ($request->filled('seller_id') && $request->user()->role === 'admin') {
            $query->where('seller_id', $request->seller_id);
        }

        // Filtro por método de pago
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        // Filtro por rango de fechas
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        // Filtro por tipo de cliente (snapshot en invoice)
        if ($request->filled('client_type')) {
            $query->where('client_type', $request->client_type);
        }

        // Para el resumen: si se pide, devolvemos totales junto con la paginación
        $paginated = $query->orderBy('created_at', 'desc')->paginate(20);

        // Calcular resumen sobre el mismo query (sin paginación)
        $summaryQuery = Invoice::query();
        if ($request->user()->role === 'vendedor') {
            $summaryQuery->where('seller_id', $request->user()->id);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $summaryQuery->where(function ($q) use ($search) {
                $q->where('client_name', 'like', "%{$search}%")
                  ->orWhere('id', 'like', "%{$search}%");
            });
        }
        if ($request->filled('seller_id') && $request->user()->role === 'admin') {
            $summaryQuery->where('seller_id', $request->seller_id);
        }
        if ($request->filled('payment_method')) {
            $summaryQuery->where('payment_method', $request->payment_method);
        }
        if ($request->filled('date_from')) {
            $summaryQuery->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $summaryQuery->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->filled('client_type')) {
            $summaryQuery->where('client_type', $request->client_type);
        }

        $summary = $summaryQuery->selectRaw('
            COUNT(*) as total_count,
            COALESCE(SUM(subtotal), 0) as total_subtotal,
            COALESCE(SUM(tax_amount), 0) as total_tax,
            COALESCE(SUM(total), 0) as total_amount,
            COALESCE(AVG(total), 0) as avg_amount
        ')->first();

        $result = $paginated->toArray();
        $result['summary'] = $summary;

        return response()->json($result);
    }

    /**
     * Crear una nueva factura con sus items.
     */
    public function store(Request $request)
    {
        $request->validate([
            'client_id' => 'nullable|integer|exists:clients,id',
            'client_name' => 'required|string|max:255',
            'client_phone' => 'nullable|string|max:100',
            'client_email' => 'nullable|string|max:255',
            'payment_method' => 'required|string|in:efectivo,cheque,transferencia,credito',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'modification_reason' => 'nullable|string',
            'seller_id' => 'nullable|integer|exists:users,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|integer|exists:products,id',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.product_code' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        // Resolver tipo de cliente (para snapshot + validación)
        $clientType = 'regular';
        if ($request->filled('client_id')) {
            $client = Client::find($request->client_id);
            if ($client) {
                $clientType = $client->type ?: 'regular';
            }
        }
        $isDistribuidor = $clientType === 'distribuidor';

        // Guards de visibility:
        //  - Cliente regular: NO puede facturar productos visibility='distribuidor_only'
        //  - Cliente distribuidor: NO puede facturar productos visibility='regular_only'
        $productIds = collect($request->items)
            ->pluck('product_id')
            ->filter()
            ->unique()
            ->values();

        if ($productIds->isNotEmpty()) {
            if (!$isDistribuidor) {
                $invalid = Product::whereIn('id', $productIds)
                    ->where('visibility', 'distribuidor_only')
                    ->pluck('name', 'id');

                if ($invalid->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        'items' => [
                            'Los siguientes productos son exclusivos para clientes distribuidores: '
                                . $invalid->values()->implode(', '),
                        ],
                    ]);
                }
            } else {
                $invalid = Product::whereIn('id', $productIds)
                    ->where('visibility', 'regular_only')
                    ->pluck('name', 'id');

                if ($invalid->isNotEmpty()) {
                    throw ValidationException::withMessages([
                        'items' => [
                            'Los siguientes productos son exclusivos para clientes regulares (no distribuidores): '
                                . $invalid->values()->implode(', '),
                        ],
                    ]);
                }
            }
        }

        return DB::transaction(function () use ($request, $clientType) {
            $taxRate = $request->input('tax_rate', 21);

            // Calcular totales
            $subtotal = 0;
            foreach ($request->items as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }
            $taxAmount = ($subtotal * $taxRate) / 100;
            $total = $subtotal + $taxAmount;

            // El vendedor que hizo la venta: si un admin factura un presupuesto
            // de un vendedor, se conserva el vendedor original.
            $sellerId = $request->user()->id;
            if ($request->user()->role === 'admin' && $request->filled('seller_id')) {
                $sellerId = (int) $request->seller_id;
            }

            $invoice = Invoice::create([
                'client_id' => $request->client_id,
                'client_name' => $request->client_name,
                'client_phone' => $request->client_phone,
                'client_email' => $request->client_email,
                'client_type' => $clientType,
                'seller_id' => $sellerId,
                'payment_method' => $request->payment_method,
                'subtotal' => $subtotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'total' => $total,
                'notes' => $request->notes,
                'modification_reason' => $request->modification_reason,
            ]);

            foreach ($request->items as $item) {
                $totalPrice = $item['quantity'] * $item['unit_price'];
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'product_code' => $item['product_code'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $totalPrice,
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            return response()->json($invoice->load(['items', 'seller']), 201);
        });
    }

    /**
     * Actualizar una factura existente (solo admin). Reemplaza los items
     * y recalcula totales. Conserva el vendedor y la fecha originales.
     */
    public function update(Request $request, Invoice $invoice)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Solo admin puede editar facturas'], 403);
        }

        $request->validate([
            'client_id'            => 'nullable|integer|exists:clients,id',
            'client_name'          => 'required|string|max:255',
            'client_phone'         => 'nullable|string|max:100',
            'client_email'         => 'nullable|string|max:255',
            'payment_method'       => 'required|string|in:efectivo,cheque,transferencia,credito',
            'tax_rate'             => 'nullable|numeric|min:0|max:100',
            'notes'                => 'nullable|string',
            'modification_reason'  => 'nullable|string',
            'items'                => 'required|array|min:1',
            'items.*.product_id'   => 'nullable|integer|exists:products,id',
            'items.*.product_name' => 'required|string|max:255',
            'items.*.product_code' => 'nullable|string|max:255',
            'items.*.quantity'     => 'required|integer|min:1',
            'items.*.unit_price'   => 'required|numeric|min:0',
            'items.*.notes'        => 'nullable|string',
        ]);

        // Resolver tipo de cliente (snapshot)
        $clientType = 'regular';
        if ($request->filled('client_id')) {
            $client = Client::find($request->client_id);
            if ($client) {
                $clientType = $client->type ?: 'regular';
            }
        }

        return DB::transaction(function () use ($request, $invoice, $clientType) {
            $taxRate = $request->input('tax_rate', $invoice->tax_rate ?? 0);

            $subtotal = 0;
            foreach ($request->items as $item) {
                $subtotal += $item['quantity'] * $item['unit_price'];
            }
            $taxAmount = ($subtotal * $taxRate) / 100;

            $invoice->update([
                'client_id'      => $request->client_id,
                'client_name'    => $request->client_name,
                'client_phone'   => $request->client_phone,
                'client_email'   => $request->client_email,
                'client_type'    => $clientType,
                'payment_method' => $request->payment_method,
                'subtotal'       => $subtotal,
                'tax_rate'       => $taxRate,
                'tax_amount'     => $taxAmount,
                'total'          => $subtotal + $taxAmount,
                'notes'          => $request->notes,
                'modification_reason' => $request->modification_reason,
            ]);

            $invoice->items()->delete();
            foreach ($request->items as $item) {
                InvoiceItem::create([
                    'invoice_id'   => $invoice->id,
                    'product_id'   => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'product_code' => $item['product_code'] ?? null,
                    'quantity'     => $item['quantity'],
                    'unit_price'   => $item['unit_price'],
                    'total_price'  => $item['quantity'] * $item['unit_price'],
                    'notes'        => $item['notes'] ?? null,
                ]);
            }

            return response()->json($invoice->load(['items', 'seller']));
        });
    }

    /**
     * Ver detalle de una factura.
     */
    public function show(Request $request, Invoice $invoice)
    {
        // Vendedor solo puede ver sus facturas
        if ($request->user()->role === 'vendedor' && $invoice->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($invoice->load(['items', 'seller']));
    }

    /**
     * Eliminar una factura (solo admin).
     */
    public function destroy(Request $request, Invoice $invoice)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Solo admin puede eliminar facturas'], 403);
        }

        $invoice->delete();
        return response()->json(['message' => 'Factura eliminada correctamente']);
    }
}
