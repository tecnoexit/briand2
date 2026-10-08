<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Reemplaza el flag booleano `distribuidor_only` por un campo `visibility`
 * de 3 estados:
 *   - 'all'              → visible para todos los clientes
 *   - 'distribuidor_only'→ sólo visible para clientes de tipo distribuidor
 *   - 'regular_only'     → sólo visible para clientes regulares (DEFAULT)
 *
 * El default es `regular_only`: si un producto no se marcó explícitamente como
 * distribuidor, asumimos que es para clientes regulares y queda oculto para
 * los distribuidores.
 *
 * Mantenemos la columna `distribuidor_only` para compatibilidad hacia atrás,
 * pero el sistema lee/escribe la nueva columna a partir de ahora.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('visibility', 32)
                ->default('regular_only')
                ->after('distribuidor_only');
        });

        // Backfill desde el flag existente
        DB::table('products')
            ->where('distribuidor_only', true)
            ->update(['visibility' => 'distribuidor_only']);

        DB::table('products')
            ->where('distribuidor_only', false)
            ->update(['visibility' => 'regular_only']);
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('visibility');
        });
    }
};
