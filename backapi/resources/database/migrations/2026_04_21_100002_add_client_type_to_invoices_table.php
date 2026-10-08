<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Snapshot del tipo de cliente al momento de emitir la factura.
 * Permite filtrar facturas por distribuidor/regular aunque el cliente
 * haya cambiado de tipo posteriormente.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('client_type', 20)->nullable()->after('client_email');
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn('client_type');
        });
    }
};
