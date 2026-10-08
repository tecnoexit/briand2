<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('invoice_items') && !Schema::hasColumn('invoice_items', 'notes')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->text('notes')->nullable()->after('total_price');
            });
        }

        if (Schema::hasTable('quote_items') && !Schema::hasColumn('quote_items', 'notes')) {
            Schema::table('quote_items', function (Blueprint $table) {
                $table->text('notes')->nullable()->after('total_price');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('invoice_items', 'notes')) {
            Schema::table('invoice_items', function (Blueprint $table) {
                $table->dropColumn('notes');
            });
        }
        if (Schema::hasColumn('quote_items', 'notes')) {
            Schema::table('quote_items', function (Blueprint $table) {
                $table->dropColumn('notes');
            });
        }
    }
};
