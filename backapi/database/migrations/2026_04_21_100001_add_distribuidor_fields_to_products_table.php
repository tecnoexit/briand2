<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega los campos relacionados al flujo "Distribuidor" en products:
 *   - distribuidor_discount_enabled: si está activo, al facturar a un cliente
 *     tipo distribuidor se aplica el porcentaje de descuento.
 *   - distribuidor_discount_percent: porcentaje (0-100) a descontar.
 *   - distribuidor_only: si está activo, el producto se oculta a clientes
 *     no-distribuidor.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('distribuidor_discount_enabled')->default(false)->after('profit_margin');
            $table->decimal('distribuidor_discount_percent', 5, 2)->default(0)->after('distribuidor_discount_enabled');
            $table->boolean('distribuidor_only')->default(false)->after('distribuidor_discount_percent');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'distribuidor_discount_enabled',
                'distribuidor_discount_percent',
                'distribuidor_only',
            ]);
        });
    }
};
