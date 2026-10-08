<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CurrencyController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\QuoteController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Ruta pública para el inicio de sesión
Route::post('/login', [AuthController::class, 'login']);

// Rutas protegidas (Requieren Token Bearer)
Route::middleware('auth:sanctum')->group(function () {

    // --- Autenticación ---
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (\Illuminate\Http\Request $request) {
        return $request->user();
    });

    // --- Gestión de Usuarios (Solo Admin) ---
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class);
    });

    // --- Gestión de Productos ---
    Route::put('/products/bulk', [ProductController::class, 'bulkUpdate']);
    // Devuelve la imagen del producto como data URL en base64 (sortea CORS para canvas/PDF).
    Route::get('/products/{product}/image-base64', [ProductController::class, 'imageBase64']);
    Route::apiResource('products', ProductController::class);

    // --- Gestión de Monedas / Cotizaciones ---
    Route::apiResource('currencies', CurrencyController::class);

    // --- Facturación (Admin y Vendedor) ---
    Route::middleware('role:admin,vendedor')->group(function () {
        Route::get('/invoices', [InvoiceController::class, 'index']);
        Route::post('/invoices', [InvoiceController::class, 'store']);
        Route::get('/invoices/{invoice}', [InvoiceController::class, 'show']);
        Route::put('/invoices/{invoice}', [InvoiceController::class, 'update']);
        Route::delete('/invoices/{invoice}', [InvoiceController::class, 'destroy']);
    });

    // --- Clientes y Presupuestos (Admin, Vendedor y Depósito) ---
    Route::middleware('role:admin,vendedor,deposito')->group(function () {
        // --- Clientes ---
        Route::get('/clients', [ClientController::class, 'index']);
        Route::post('/clients', [ClientController::class, 'store']);
        Route::put('/clients/{client}', [ClientController::class, 'update']);

        // --- Presupuestos ---
        Route::get('/quotes', [QuoteController::class, 'index']);
        Route::post('/quotes', [QuoteController::class, 'store']);
        Route::get('/quotes/{quote}', [QuoteController::class, 'show']);
        Route::put('/quotes/{quote}', [QuoteController::class, 'update']);
        Route::delete('/quotes/{quote}', [QuoteController::class, 'destroy']);
    });
});
