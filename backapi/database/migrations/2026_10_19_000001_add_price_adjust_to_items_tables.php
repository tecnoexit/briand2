<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega a los ítems de facturas y presupuestos la posibilidad de ajustar
 * manualmente el precio por ítem de forma porcentual:
 *   - base_unit_price: precio de referencia (antes del ajuste).
 *   - price_adjust_percent: porcentaje firmado. Negativo = descuento,
 *     positivo = recargo. El precio final = base * (1 + pct / 100).
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('invoice_items') && !Schema::hasColumn('invoice_items', 'base_unit_price')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->decimal('base_unit_price', 15, 2)->nullable()->after('unit_price');
                $table->decimal('price_adjust_percent', 6, 2)->default(0)->after('base_unit_price');
            });
        }

        if (Schema::hasTable('quote_items') && !Schema::hasColumn('quote_items', 'base_unit_price')) {
            Schema::table('quote_items', function (Blueprint $table) {
                $table->decimal('base_unit_price', 15, 2)->nullable()->after('unit_price');
                $table->decimal('price_adjust_percent', 6, 2)->default(0)->after('base_unit_price');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('invoice_items') && Schema::hasColumn('invoice_items', 'base_unit_price')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->dropColumn(['base_unit_price', 'price_adjust_percent']);
            });
        }

        if (Schema::hasTable('quote_items') && Schema::hasColumn('quote_items', 'base_unit_price')) {
            Schema::table('quote_items', function (Blueprint $table) {
                $table->dropColumn(['base_unit_price', 'price_adjust_percent']);
            });
        }
    }
};
