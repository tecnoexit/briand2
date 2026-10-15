<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
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
        'notes',
        'modification_reason',
        'void_status',
        'void_reason',
        'void_requested_by',
        'void_requested_at',
        'void_authorized_by',
        'void_authorized_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total' => 'decimal:2',
        'void_requested_at' => 'datetime',
        'void_authorized_at' => 'datetime',
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
        return $this->hasMany(InvoiceItem::class);
    }

    public function voidRequestedBy()
    {
        return $this->belongsTo(User::class, 'void_requested_by');
    }

    public function voidAuthorizedBy()
    {
        return $this->belongsTo(User::class, 'void_authorized_by');
    }
}
