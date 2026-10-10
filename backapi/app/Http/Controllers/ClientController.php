<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    /**
     * Listar clientes con búsqueda opcional.
     */
    public function index(Request $request)
    {
        $query = Client::query();

        // Filtro por estado (status=active|inactive|all). Por defecto, solo activos.
        $status = $request->get('status', 'active');
        if ($status === 'active') {
            $query->where('active', true);
        } elseif ($status === 'inactive') {
            $query->where('active', false);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filtro opcional por tipo (?type=regular|distribuidor)
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        // Límite configurable (por defecto 50, máximo 1000).
        $limit = (int) $request->get('limit', 50);
        if ($limit <= 0 || $limit > 1000) {
            $limit = 50;
        }

        return response()->json($query->orderBy('name')->limit($limit)->get());
    }

    /**
     * Crear un nuevo cliente.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name'    => 'required|string|max:255',
            'phone'   => 'nullable|string|max:100',
            'email'   => 'nullable|string|email|max:255',
            'address' => 'nullable|string|max:500',
            'type'    => 'sometimes|in:regular,distribuidor',
        ]);

        $client = Client::create($request->only(['name', 'phone', 'email', 'address', 'type']));

        return response()->json($client, 201);
    }

    /**
     * Actualizar un cliente.
     */
    public function update(Request $request, Client $client)
    {
        $request->validate([
            'name'    => 'string|max:255',
            'phone'   => 'nullable|string|max:100',
            'email'   => 'nullable|string|email|max:255',
            'address' => 'nullable|string|max:500',
            'active'  => 'nullable|boolean',
            'type'    => 'sometimes|in:regular,distribuidor',
        ]);

        $client->update($request->only(['name', 'phone', 'email', 'address', 'active', 'type']));

        return response()->json($client);
    }
}
