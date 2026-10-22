<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'items.*.base_unit_price' => 'nullable|numeric|min:0',
            'items.*.price_adjust_percent' => 'nullable|numeric',
            'items.*.notes' => 'nullable|string',
        ]);

        // Resolver tipo de cliente (para snapshot)
        $clientType = 'regular';
        if ($request->filled('client_id')) {
            $client = Client::find($request->client_id);
            if ($client) {
                $clientType = $client->type ?: 'regular';
            }
        }
        return DB::transaction(function () use ($request, $clientType) {
            $taxRate = $request->input('tax_rate', 21);

            // Calcular totales
            $subtotal = 0;
            foreach ($request->items as $item) {
                [, , $unitPrice] = $this->itemPrices($item);
                $subtotal += $item['quantity'] * $unitPrice;
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
                [$basePrice, $adjustPercent, $unitPrice] = $this->itemPrices($item);
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'product_code' => $item['product_code'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'base_unit_price' => $basePrice,
                    'price_adjust_percent' => $adjustPercent,
                    'total_price' => $item['quantity'] * $unitPrice,
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
            'items.*.base_unit_price' => 'nullable|numeric|min:0',
            'items.*.price_adjust_percent' => 'nullable|numeric',
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
                [, , $unitPrice] = $this->itemPrices($item);
                $subtotal += $item['quantity'] * $unitPrice;
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
                [$basePrice, $adjustPercent, $unitPrice] = $this->itemPrices($item);
                InvoiceItem::create([
                    'invoice_id'   => $invoice->id,
                    'product_id'   => $item['product_id'] ?? null,
                    'product_name' => $item['product_name'],
                    'product_code' => $item['product_code'] ?? null,
                    'quantity'     => $item['quantity'],
                    'unit_price'   => $unitPrice,
                    'base_unit_price' => $basePrice,
                    'price_adjust_percent' => $adjustPercent,
                    'total_price'  => $item['quantity'] * $unitPrice,
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

        return response()->json($invoice->load(['items', 'seller', 'voidRequestedBy', 'voidAuthorizedBy']));
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

    /**
     * Solicitar la anulación de una boleta (el vendedor de la boleta o un admin).
     * El motivo es obligatorio. Queda en estado "pendiente" hasta la autorización.
     */
    public function requestVoid(Request $request, Invoice $invoice)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $invoice->seller_id !== $user->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'void_reason' => 'required|string|max:1000',
        ]);

        $invoice->update([
            'void_status'        => 'pendiente',
            'void_reason'        => $request->void_reason,
            'void_requested_by'  => $user->id,
            'void_requested_at'  => now(),
            'void_authorized_by' => null,
            'void_authorized_at' => null,
        ]);

        return response()->json($invoice->load(['seller', 'voidRequestedBy']));
    }

    /**
     * Autorizar una anulación (solo admin). La boleta deja de computar
     * en el saldo, conservando su historial.
     */
    public function authorizeVoid(Request $request, Invoice $invoice)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Solo admin puede autorizar anulaciones'], 403);
        }

        $invoice->update([
            'void_status'        => 'anulada',
            'void_authorized_by' => $request->user()->id,
            'void_authorized_at' => now(),
        ]);

        return response()->json($invoice->load(['seller', 'voidRequestedBy', 'voidAuthorizedBy']));
    }

    /**
     * Calcula el precio final de un ítem aplicando el ajuste porcentual manual.
     * Devuelve [base_unit_price, price_adjust_percent, unit_price].
     */
    private function itemPrices(array $item): array
    {
        $base = $item['base_unit_price'] ?? null;
        if ($base === null || $base === '') {
            $base = (float) ($item['unit_price'] ?? 0);
        }
        $base  = (float) $base;
        $pct   = (float) ($item['price_adjust_percent'] ?? 0);
        $unit  = round($base * (1 + $pct / 100), 2);

        return [$base, $pct, $unit];
    }
}
