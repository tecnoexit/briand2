<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Currency;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class InitialDataSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Crear Usuarios
        User::create([
            'name' => 'Administrador',
            'email' => 'admin@sys.com',
            'password' => Hash::make('password123'),
            'role' => 'admin', // Asegúrate de tener este campo en tu migración
        ]);

        User::create([
            'name' => 'Cliente de Prueba',
            'email' => 'cliente@sys.com',
            'password' => Hash::make('password123'),
            'role' => 'cliente',
        ]);

        // 2. Crear Monedas (necesarias para los productos)
        Currency::create(['name' => 'Peso Argentino', 'symbol' => 'ARS', 'rate' => 1]);
        Currency::create(['name' => 'Dólar Proveedor A', 'symbol' => 'USD-A', 'rate' => 1050]);
        Currency::create(['name' => 'Dólar Proveedor B', 'symbol' => 'USD-B', 'rate' => 1120]);

        $this->command->info('Usuarios y monedas creados con éxito.');
    }
}