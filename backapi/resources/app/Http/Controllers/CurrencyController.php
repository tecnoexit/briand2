<?php

namespace App\Http\Controllers;

use App\Models\Currency;
use Illuminate\Http\Request;

class CurrencyController extends Controller
{
    public function index()
    {
        return Currency::all();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'   => 'required|string',
            'symbol' => 'required|string',
            'rate'   => 'required|numeric',
            'factor' => 'nullable|numeric|min:0',  // porcentaje para precio_venta, ej: 20 = 20%
        ]);

        // Asegurar valor por defecto
        $data['factor'] = isset($data['factor']) ? $data['factor'] : 0.0;

        return Currency::create($data);
    }

    public function update(Request $request, Currency $currency)
    {
        $data = $request->validate([
            'name'   => 'string',
            'symbol' => 'string',
            'rate'   => 'numeric',
            'factor' => 'numeric|min:0',
        ]);

        $currency->update($data);
        return $currency;
    }

    public function destroy(Currency $currency)
    {
        // Lógica que tenías en el hook: no borrar si hay productos asociados
        if ($currency->products()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar: hay productos usando esta moneda'
            ], 422);
        }

        $currency->delete();
        return response()->json(['message' => 'Moneda eliminada']);
    }
}