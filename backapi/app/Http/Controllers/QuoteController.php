<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class QuoteController extends Controller
{
    /**
     * Listar presupuestos. Admin ve todos, vendedor solo los suyos.
     */
    public function index(Request $request)
    {
        $query = Quote::with(['items', 'seller']);

        if ($request->user()->role !== 'admin') {
            $query->where('seller_id', $request->user()->id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('client_name', 'like', "%{$search}%")
                  ->orWhere('id', 'like', "%{$search}%");
            });
        }

        if ($request->filled('seller_id') && $request->user()->role === 'admin') {
            $query->where('seller_id', $request->seller_id);
        }

        if ($request->filled('estado')) {
            $query->where('estado', $request->estado);
        }

        if ($request->filled('client_type')) {
            $query->where('client_type', $request->client_type);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $paginated = $query->orderBy('created_at', 'desc')->paginate(20);

        if ($request->user()->role === 'deposito') {
            $paginated->getCollection()->each(fn ($q) => $this->hideQuotePrices($q));
        }

        return response()->json($paginated->toArray());
    }

    /**
     * Crear un presupuesto con sus items.
     */
    public function store(Request $request)
    {
        $request->validate([
            'client_id'             => 'nullable|integer|exists:clients,id',
            'client_name'           => 'required|string|max:255',
            'client_phone'          => 'nullable|string|max:100',
            'client_email'          => 'nullable|string|max:255',
            'payment_method'        => 'nullable|string|in:efectivo,cheque,transferencia,credito',
            'tax_rate'              => 'nullable|numeric|min:0|max:100',
            'estado'                => 'nullable|in:pendiente,aceptado,rechazado,vencido',
            'valid_until'           => 'nullable|date',
            'notes'                 => 'nullable|string',
            'seller_id'             => 'nullable|integer|exists:users,id',
            'items'                 => 'required|array|min:1',
            'items.*.product_id'    => 'nullable|integer|exists:products,id',
            'items.*.product_name'  => 'required|string|max:255',
            'items.*.product_code'  => 'nullable|string|max:255',
            'items.*.quantity'      => 'required|integer|min:1',
            'items.*.unit_price'    => 'nullable|numeric|min:0',
            'items.*.notes'         => 'nullable|string',
        ]);

        $clientType = $this->resolveClientType($request);
        $isDeposito = $request->user()->role === 'deposito';

        return DB::transaction(function () use ($request, $clientType, $isDeposito) {
            $taxRate = $request->input('tax_rate', 0);

            $subtotal = 0;
            foreach ($request->items as $item) {
                $unitPrice = $isDeposito ? 0 : ($item['unit_price'] ?? 0);
                $subtotal += $item['quantity'] * $unitPrice;
            }
            $taxAmount = ($subtotal * $taxRate) / 100;
            $total = $subtotal + $taxAmount;

            // El vendedor: un admin puede asignar un vendedor específico.
            $sellerId = $request->user()->id;
            if ($request->user()->role === 'admin' && $request->filled('seller_id')) {
                $sellerId = (int) $request->seller_id;
            }

            $quote = Quote::create([
                'client_id'      => $request->client_id,
                'client_name'    => $request->client_name,
                'client_phone'   => $request->client_phone,
                'client_email'   => $request->client_email,
                'client_type'    => $clientType,
                'seller_id'      => $sellerId,
                'payment_method' => $request->input('payment_method', 'efectivo'),
                'subtotal'       => $subtotal,
                'tax_rate'       => $taxRate,
                'tax_amount'     => $taxAmount,
                'total'          => $total,
                'estado'         => $request->input('estado', 'pendiente'),
                'valid_until'    => $request->input('valid_until') ?: now()->addDays(15),
                'notes'          => $request->notes,
                'sin_precios'    => $isDeposito,
            ]);

            $this->syncItems($quote, $request->items, $isDeposito);

            $quote->load(['items.product', 'seller']);
            if ($request->user()->role === 'deposito') {
                $this->hideQuotePrices($quote);
            }
            return response()->json($quote, 201);
        });
    }

    /**
     * Ver detalle de un presupuesto.
     */
    public function show(Request $request, Quote $quote)
    {
        if ($request->user()->role !== 'admin' && $quote->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $quote->load(['items.product', 'seller', 'client']);
        if ($request->user()->role === 'deposito') {
            $this->hideQuotePrices($quote);
        }
        return response()->json($quote);
    }

    /**
     * Actualizar un presupuesto. Reemplaza por completo los items
     * (permite editarlo cuantas veces sea necesario).
     */
    public function update(Request $request, Quote $quote)
    {
        if ($request->user()->role !== 'admin' && $quote->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'client_id'             => 'nullable|integer|exists:clients,id',
            'client_name'           => 'sometimes|required|string|max:255',
            'client_phone'          => 'nullable|string|max:100',
            'client_email'          => 'nullable|string|max:255',
            'payment_method'        => 'nullable|string|in:efectivo,cheque,transferencia,credito',
            'tax_rate'              => 'nullable|numeric|min:0|max:100',
            'estado'                => 'nullable|in:pendiente,aceptado,rechazado,vencido',
            'valid_until'           => 'nullable|date',
            'notes'                 => 'nullable|string',
            'seller_id'             => 'nullable|integer|exists:users,id',
            'items'                 => 'nullable|array|min:1',
            'items.*.product_id'    => 'nullable|integer|exists:products,id',
            'items.*.product_name'  => 'required_with:items|string|max:255',
            'items.*.product_code'  => 'nullable|string|max:255',
            'items.*.quantity'      => 'required_with:items|integer|min:1',
            'items.*.unit_price'    => 'nullable|numeric|min:0',
            'items.*.notes'         => 'nullable|string',
        ]);

        return DB::transaction(function () use ($request, $quote) {
            $isDeposito = $request->user()->role === 'deposito';
            $clientType = $request->has('client_id') || $request->has('client_name')
                ? $this->resolveClientType($request)
                : $quote->client_type;

            // Campos simples
            $quote->fill($request->only([
                'client_id', 'client_name', 'client_phone', 'client_email',
                'payment_method', 'estado', 'valid_until', 'notes',
            ]));
            $quote->client_type = $clientType;

            // Un admin puede reasignar el vendedor del presupuesto.
            if ($request->user()->role === 'admin' && $request->filled('seller_id')) {
                $quote->seller_id = (int) $request->seller_id;
            }

            // Si vienen items, los reemplazamos y recalculamos totales.
            if ($request->filled('items')) {
                $taxRate = $request->input('tax_rate', $quote->tax_rate ?? 0);

                $subtotal = 0;
                foreach ($request->items as $item) {
                    $unitPrice = $isDeposito ? 0 : ($item['unit_price'] ?? 0);
                    $subtotal += $item['quantity'] * $unitPrice;
                }
                $taxAmount = ($subtotal * $taxRate) / 100;

                $quote->tax_rate   = $taxRate;
                $quote->subtotal   = $subtotal;
                $quote->tax_amount = $taxAmount;
                $quote->total      = $subtotal + $taxAmount;
                $quote->sin_precios = $isDeposito;

                $quote->items()->delete();
                $quote->save();
                $this->syncItems($quote, $request->items, $isDeposito);
            } else {
                $quote->save();
            }

            $quote->load(['items.product', 'seller']);
            if ($request->user()->role === 'deposito') {
                $this->hideQuotePrices($quote);
            }
            return response()->json($quote);
        });
    }

    /**
     * Eliminar un presupuesto.
     */
    public function destroy(Request $request, Quote $quote)
    {
        if ($request->user()->role !== 'admin' && $quote->seller_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $quote->delete();
        return response()->json(['message' => 'Presupuesto eliminado correctamente']);
    }

    /**
     * Oculta los campos de precio de un presupuesto (para el rol depósito).
     */
    private function hideQuotePrices(Quote $quote): void
    {
        $quote->makeHidden(['subtotal', 'tax_rate', 'tax_amount', 'total']);
        if ($quote->relationLoaded('items') && $quote->items) {
            $quote->items->makeHidden(['unit_price', 'total_price']);
        }
    }

    /**
     * Determina el tipo de cliente (snapshot) a partir del client_id.
     */
    private function resolveClientType(Request $request): string
    {
        $clientType = 'regular';
        if ($request->filled('client_id')) {
            $client = Client::find($request->client_id);
            if ($client) {
                $clientType = $client->type ?: 'regular';
            }
        }
        return $clientType;
    }

    /**
     * Crea los items del presupuesto.
     */
    private function syncItems(Quote $quote, array $items, bool $zeroPrices = false): void
    {
        foreach ($items as $item) {
            $unitPrice  = $zeroPrices ? 0 : ($item['unit_price'] ?? 0);
            $totalPrice = $item['quantity'] * $unitPrice;
            QuoteItem::create([
                'quote_id'     => $quote->id,
                'product_id'   => $item['product_id'] ?? null,
                'product_name' => $item['product_name'],
                'product_code' => $item['product_code'] ?? null,
                'quantity'     => $item['quantity'],
                'unit_price'   => $unitPrice,
                'total_price'  => $totalPrice,
                'notes'        => $item['notes'] ?? null,
            ]);
        }
    }
}
