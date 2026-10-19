<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'product_id',
        'product_name',
        'product_code',
        'quantity',
        'unit_price',
        'base_unit_price',
        'price_adjust_percent',
        'total_price',
        'notes',
    ];

    protected $casts = [
        'unit_price'          => 'decimal:2',
        'base_unit_price'     => 'decimal:2',
        'price_adjust_percent' => 'float',
        'total_price'         => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
