<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Agrega precio_lista e impuesto a la tabla products.
     * El precio_costo (price) pasa a ser calculado: precio_lista * impuesto
     *
     * impuesto: porcentaje (ej: 20 para 20% de IVA, 0 sin impuesto)
     * precio_costo = precio_lista * (1 + impuesto / 100)
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('precio_lista', 15, 2)->default(0)->after('profit_margin');
            $table->decimal('impuesto', 8, 2)->default(0.00)->after('precio_lista');
        });

        // Migrar datos existentes: precio_lista = price (precio_costo actual), impuesto = 0%
        \DB::table('products')->update([
            'precio_lista' => \DB::raw('price'),
            'impuesto'     => 0.00,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['precio_lista', 'impuesto']);
        });
    }
};
