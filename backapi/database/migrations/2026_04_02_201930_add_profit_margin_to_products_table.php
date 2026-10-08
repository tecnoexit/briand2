<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint; // Importación correcta
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        // Cambia (Table $table) por (Blueprint $table)
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('profit_margin', 8, 2)->default(0)->after('price');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('profit_margin');
        });
    }
};