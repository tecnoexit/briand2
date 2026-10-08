<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'description', 'code',
        'precio_lista', 'impuesto', 'price',   // price = precio_costo (calculado: precio_lista * impuesto)
        'profit_margin',
        'currency_id', 'stock', 'image_url',
        // --- Distribuidor ---
        'distribuidor_discount_enabled',
        'distribuidor_discount_percent',
        'distribuidor_only',          // legacy, conservado por compatibilidad
        'visibility',                 // 'all' | 'distribuidor_only' | 'regular_only'
    ];

    protected $casts = [
        'distribuidor_discount_enabled' => 'boolean',
        'distribuidor_only'             => 'boolean',
        'distribuidor_discount_percent' => 'float',
        'precio_lista'                  => 'float',
        'impuesto'                      => 'float',
        'price'                         => 'float',
        'profit_margin'                 => 'float',
    ];

    protected $attributes = [
        // Default: si no se especifica, el producto es visible sólo a clientes regulares.
        'visibility' => 'regular_only',
    ];

    // Esto permite que al cargar el producto, Laravel pueda incluir la moneda
    public function currency()
    {
        return $this->belongsTo(Currency::class);
    }
}