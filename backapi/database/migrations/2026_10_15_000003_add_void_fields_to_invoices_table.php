<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Anulación de boletas (facturas) con motivo obligatorio.
 *   void_status: 'vigente' | 'pendiente' | 'anulada'
 * Una boleta 'anulada' deja de computar en el saldo de la cuenta corriente,
 * pero conserva su historial.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('void_status')->default('vigente')->after('modification_reason');
            $table->text('void_reason')->nullable()->after('void_status');
            $table->foreignId('void_requested_by')->nullable()->after('void_reason')->constrained('users')->nullOnDelete();
            $table->timestamp('void_requested_at')->nullable()->after('void_requested_by');
            $table->foreignId('void_authorized_by')->nullable()->after('void_requested_at')->constrained('users')->nullOnDelete();
            $table->timestamp('void_authorized_at')->nullable()->after('void_authorized_by');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropForeign(['void_requested_by']);
            $table->dropForeign(['void_authorized_by']);
            $table->dropColumn([
                'void_status',
                'void_reason',
                'void_requested_by',
                'void_requested_at',
                'void_authorized_by',
                'void_authorized_at',
            ]);
        });
    }
};
