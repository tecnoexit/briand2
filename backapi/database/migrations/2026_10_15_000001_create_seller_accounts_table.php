<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Saldo inicial de la cuenta corriente de cada vendedor.
 * El saldo corriente se calcula:
 *   saldo = saldo_inicial + suma(boletas vigentes) - suma(pagos)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('seller_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_accounts');
    }
};
