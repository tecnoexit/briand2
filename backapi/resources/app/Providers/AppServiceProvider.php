<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL; // <-- Importante añadir esto

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Forzamos a Laravel a reconocer su ubicación en producción
        if (config('app.env') === 'production') {
            // Esto hace que Laravel ignore que está en una subcarpeta física
            // y use la URL base de tu .env para generar y comparar rutas.
            URL::forceRootUrl(config('app.url'));
        }
    }
}