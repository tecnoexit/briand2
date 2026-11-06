<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'amount',
        'commission_adjustment',
        'method',
        'reference',
        'notes',
        'paid_at',
        'created_by',
    ];

    protected $casts = [
        'amount'  => 'decimal:2',
        'commission_adjustment' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
