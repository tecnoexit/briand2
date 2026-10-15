<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use App\Models\SellerAccount;
use App\Models\User;
use Illuminate\Http\Request;

class AccountController extends Controller
{
    /**
     * Resumen de saldos por vendedor (solo admin).
     * saldo = saldo inicial + suma(boletas vigentes) - suma(pagos)
     */
    public function index(Request $request)
    {
        $sellers = User::where('role', 'vendedor')->orderBy('name')->get();

        $result = $sellers->map(function ($seller) {
            return array_merge(
                ['seller' => $seller->only(['id', 'name', 'email'])],
                $this->accountSummary($seller->id),
            );
        });

        $totals = $result->reduce(function ($carry, $row) {
            $carry['opening_balance'] += $row['opening_balance'];
            $carry['invoiced'] += $row['invoiced'];
            $carry['paid'] += $row['paid'];
            $carry['balance'] += $row['balance'];
            return $carry;
        }, ['opening_balance' => 0, 'invoiced' => 0, 'paid' => 0, 'balance' => 0]);

        return response()->json([
            'sellers' => $result->values(),
            'totals' => $totals,
        ]);
    }

    /**
     * Detalle de la cuenta corriente de un vendedor (solo admin).
     */
    public function show(Request $request, User $seller)
    {
        return response()->json($this->detailFor($seller, $request));
    }

    /**
     * Cuenta corriente del vendedor autenticado.
     */
    public function mine(Request $request)
    {
        return response()->json($this->detailFor($request->user(), $request));
    }

    /**
     * Registrar un pago a cuenta (solo admin).
     */
    public function storePayment(Request $request)
    {
        $request->validate([
            'seller_id' => 'required|integer|exists:users,id',
            'amount'    => 'required|numeric|min:0',
            'method'    => 'required|string|in:efectivo,transferencia,cheque,otro',
            'reference' => 'nullable|string|max:255',
            'notes'     => 'nullable|string',
            'paid_at'   => 'nullable|date',
        ]);

        $payment = Payment::create([
            'seller_id'  => $request->seller_id,
            'amount'     => $request->amount,
            'method'     => $request->method,
            'reference'  => $request->reference,
            'notes'      => $request->notes,
            'paid_at'    => $request->filled('paid_at') ? $request->paid_at : now(),
            'created_by' => $request->user()->id,
        ]);

        return response()->json($payment->load(['seller', 'creator']), 201);
    }

    /**
     * Ajustar el saldo inicial de un vendedor (solo admin).
     */
    public function updateOpeningBalance(Request $request, User $seller)
    {
        $request->validate([
            'opening_balance' => 'required|numeric',
        ]);

        $account = SellerAccount::updateOrCreate(
            ['seller_id' => $seller->id],
            ['opening_balance' => $request->opening_balance],
        );

        return response()->json($account);
    }

    /**
     * Arma el detalle completo (saldo + boletas + pagos) para un vendedor.
     */
    private function detailFor(User $seller, Request $request): array
    {
        $invoicesQuery = Invoice::where('seller_id', $seller->id)
            ->with(['items', 'seller'])
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $invoicesQuery->where('id', 'like', "%{$request->search}%");
        }
        if ($request->filled('date_from')) {
            $invoicesQuery->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $invoicesQuery->whereDate('created_at', '<=', $request->date_to);
        }

        $invoices = $invoicesQuery->paginate(20);

        $payments = Payment::where('seller_id', $seller->id)
            ->with('creator')
            ->orderBy('paid_at', 'desc')
            ->get();

        return array_merge(
            ['seller' => $seller->only(['id', 'name', 'email', 'role'])],
            $this->accountSummary($seller->id),
            [
                'invoices' => $invoices,
                'payments' => $payments,
            ],
        );
    }

    /**
     * Calcula el saldo corriente de un vendedor.
     */
    private function accountSummary(int $sellerId): array
    {
        $opening = (float) (SellerAccount::where('seller_id', $sellerId)->value('opening_balance') ?? 0);
        $invoiced = (float) Invoice::where('seller_id', $sellerId)
            ->where('void_status', '!=', 'anulada')
            ->sum('total');
        $paid = (float) Payment::where('seller_id', $sellerId)->sum('amount');

        return [
            'opening_balance' => round($opening, 2),
            'invoiced' => round($invoiced, 2),
            'paid' => round($paid, 2),
            'balance' => round($opening + $invoiced - $paid, 2),
        ];
    }
}
