<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agrega el campo 'type' a la tabla clients:
 *   - 'regular' (default): cliente común.
 *   - 'distribuidor': aplica descuentos configurados en productos y habilita
 *     productos exclusivos para distribuidores.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->string('type', 20)->default('regular')->after('active');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
