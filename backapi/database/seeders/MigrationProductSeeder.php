<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class MigrationProductSeeder extends Seeder
{
    public function run()
    {
        // 1. Crear tabla temporal idéntica a la vieja
        DB::statement("DROP TABLE IF EXISTS old_system_products");
        DB::statement("CREATE TABLE old_system_products (
            id_producto int,
            codigo_producto varchar(255),
            nombre_producto varchar(255),
            stock int,
            status_producto int,
            date_added varchar(255),
            precio_producto double,
            imagen varchar(512),
            costo float,
            actualizado timestamp NULL
        )");

        $path = database_path('seeders/products.sql');
        
        // 2. Leer el archivo línea por línea para evitar saturar la memoria y fallos de ejecución
        $lines = file($path);
        $currentSql = "";
        $this->command->info('Procesando archivo SQL en bloques...');

        foreach ($lines as $line) {
            // Saltamos comentarios y líneas vacías
            if (empty(trim($line)) || str_starts_with(trim($line), '--') || str_starts_with(trim($line), '/*')) {
                continue;
            }

            $currentSql .= $line;

            // Si la línea termina en ";", significa que terminó una instrucción SQL (un bloque de INSERT)
            if (str_ends_with(trim($line), ';')) {
                // Cambiamos el nombre de la tabla al vuelo
                $executableSql = str_replace('INSERT INTO `products`', 'INSERT INTO `old_system_products`', $currentSql);
                
                // Ejecutamos solo si es un INSERT
                if (str_contains($executableSql, 'INSERT INTO')) {
                    try {
                        DB::unprepared($executableSql);
                    } catch (\Exception $e) {
                        // Ignoramos errores de estructura si los hay y seguimos
                    }
                }
                $currentSql = ""; // Limpiamos para el siguiente bloque
            }
        }

        // 3. Migrar datos de la tabla temporal a la final de Laravel
        $items = DB::table('old_system_products')->get();
        $total = $items->count();
        $this->command->info("Se cargaron $total registros en la tabla temporal. Iniciando migración a Laravel...");

        $this->command->getOutput()->progressStart($total);

        // Usamos una transacción para que la inserción de 5000 filas sea instantánea
        DB::transaction(function() use ($items) {
            foreach ($items as $item) {
                $nombreArchivo = str_replace('uploads/', '', $item->imagen);

                // IMPORTANTE: usamos el id original del sistema viejo como "id" si quieres mantener la relación
                // o dejamos que Laravel asigne nuevos. Aquí usamos el código como llave única.
                Product::updateOrCreate(
                    ['code' => trim($item->codigo_producto . '-' . $item->id_producto)],
                    [
                        'name'        => $item->nombre_producto,
                        'description' => '',
                        // 'description' => $item->nombre_producto,
                        'price'       => $item->precio_producto,
                        'stock'       => $item->stock,
                        'currency_id' => 1,
                        'image_url'   => $item->imagen ? '/storage/products/' . $nombreArchivo : null
                    ]
                );
                $this->command->getOutput()->progressAdvance();
            }
        });

        $this->command->getOutput()->progressFinish();

        // 4. Limpiar
        DB::statement("DROP TABLE old_system_products");
        $this->command->info('¡Migración de todos los productos terminada!');
    }
}