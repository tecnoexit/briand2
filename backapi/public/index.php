
<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// --- INICIO DE LA CORRECCIÓN PARA HOSTINGER (SUBDIRECTORIO) ---
/**
 * Esta sección limpia la URI para que Laravel ignore la carpeta física 'backapi'
 * y pueda mapear las rutas correctamente (ej. /backapi/api/login -> /api/login).
 */
if (isset($_SERVER['REQUEST_URI'])) {
    $folderPath = '/backapi';
    
    // Solo reemplazamos si la URI comienza con el nombre de la carpeta
    if (str_starts_with($_SERVER['REQUEST_URI'], $folderPath)) {
        $_SERVER['REQUEST_URI'] = substr($_SERVER['REQUEST_URI'], strlen($folderPath));
    }

    // Si la URI quedó vacía (acceso a la raíz de la carpeta), forzamos el slash
    if (empty($_SERVER['REQUEST_URI'])) {
        $_SERVER['REQUEST_URI'] = '/';
    }
}
// --- FIN DE LA CORRECCIÓN ---

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());