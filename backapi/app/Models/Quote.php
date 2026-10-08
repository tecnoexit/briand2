<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quote extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'client_name',
        'client_phone',
        'client_email',
        'client_type',
        'seller_id',
        'payment_method',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'total',
        'estado',
        'valid_until',
        'notes',
    ];

    protected $casts = [
        'subtotal'    => 'decimal:2',
        'tax_rate'    => 'decimal:2',
        'tax_amount'  => 'decimal:2',
        'total'       => 'decimal:2',
        'valid_until' => 'date',
    ];

    protected $attributes = [
        'estado' => 'pendiente',
    ];

    public function client()
    {
        return $this->belongsTo(\App\Models\Client::class);
    }

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function items()
    {
        return $this->hasMany(QuoteItem::class);
    }
}
