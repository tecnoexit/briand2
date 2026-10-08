<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class UserController extends Controller
{
    /**
     * Listar todos los usuarios.
     */
    public function index()
    {
        // Devolvemos todos los usuarios ordenados por el más reciente
        return response()->json(User::orderBy('created_at', 'desc')->get());
    }

    /**
     * Crear un nuevo usuario.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:admin,cliente,vendedor,distribuidor,deposito',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password), // Encriptamos la clave
            'role' => $request->role,
        ]);

        return response()->json($user, 201);
    }

    /**
     * Mostrar un usuario específico.
     */
    public function show(User $user)
    {
        return response()->json($user);
    }

    /**
     * Actualizar un usuario existente.
     */
    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'string|max:255',
            'email' => 'string|email|max:255|unique:users,email,' . $user->id,
            'role' => 'string|in:admin,cliente,vendedor,distribuidor,deposito',
        ]);

        $user->update($request->only(['name', 'email', 'role']));

        // Si envían una nueva contraseña, la actualizamos por separado
        if ($request->filled('password')) {
            $user->update(['password' => Hash::make($request->password)]);
        }

        return response()->json($user);
    }

    /**
     * Eliminar un usuario.
     */
    public function destroy(User $user)
    {
        // Evitamos que un admin se borre a sí mismo (opcional pero recomendado)
        if (auth()->id() === $user->id) {
            return response()->json(['message' => 'No puedes eliminar tu propio usuario'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }
}