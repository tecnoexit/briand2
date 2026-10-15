<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'active',
        'type', // 'regular' | 'distribuidor'
        'seller_id',
        'assigned_by',
        'assigned_at',
    ];

    protected $casts = [
        'active' => 'boolean',
        'assigned_at' => 'datetime',
    ];

    /**
     * Por si el frontend o la DB no tienen el valor seteado todavía,
     * default = 'regular'.
     */
    protected $attributes = [
        'type' => 'regular',
    ];

    public function isDistribuidor(): bool
    {
        return $this->type === 'distribuidor';
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }

    public function seller()
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
