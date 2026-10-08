<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Agrega el campo 'factor' a la tabla currencies.
     * factor: porcentaje adicional sobre el precio de venta.
     * precio_venta = precio_costo * (1 + factor/100) * (1 + ganancia/100)
     *
     * Por defecto es 0.00 (sin efecto, 0%).
     */
    public function up(): void
    {
        Schema::table('currencies', function (Blueprint $table) {
            $table->decimal('factor', 8, 2)->default(0.00)->after('rate');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('currencies', function (Blueprint $table) {
            $table->dropColumn('factor');
        });
    }
};
