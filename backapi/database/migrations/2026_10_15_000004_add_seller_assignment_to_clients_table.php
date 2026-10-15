<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Asignación de clientes a un vendedor/distribuidor (solo admin).
 *   seller_id: usuario responsable del cliente (vendedor o distribuidor).
 *   assigned_by / assigned_at: auditoría de quién y cuándo se asignó.
 *   Un cliente sin asignación (seller_id NULL) sigue funcionando como hasta ahora.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->foreignId('seller_id')->nullable()->after('type')->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->after('seller_id')->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable()->after('assigned_by');
            $table->index('seller_id');
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex(['seller_id']);
            $table->dropForeign(['assigned_by']);
            $table->dropForeign(['seller_id']);
            $table->dropColumn(['seller_id', 'assigned_by', 'assigned_at']);
        });
    }
};
