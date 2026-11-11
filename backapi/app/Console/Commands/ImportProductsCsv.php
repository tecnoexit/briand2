<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportProductsCsv extends Command
{
    protected $signature = 'products:import-csv
        {path : Ruta al archivo CSV}
        {--dry-run : Valida y muestra el resultado sin guardar cambios}';

    protected $description = 'Actualiza productos existentes por código y agrega productos nuevos desde un CSV';

    public function handle(): int
    {
        $path = $this->argument('path');
        if (!is_file($path) || !is_readable($path)) {
            $this->error("No se puede leer el archivo: {$path}");
            return self::FAILURE;
        }

        $handle = fopen($path, 'rb');
        $headers = fgetcsv($handle);
        if (!$headers) {
            fclose($handle);
            $this->error('El CSV no tiene encabezado.');
            return self::FAILURE;
        }
        $headers[0] = preg_replace('/^\xEF\xBB\xBF/', '', $headers[0]);

        $required = ['name', 'code', 'price', 'profit_margin', 'distribuidor_discount_enabled',
            'distribuidor_discount_percent', 'distribuidor_only', 'visibility', 'precio_lista',
            'impuesto', 'currency_id', 'stock', 'description', 'image_url'];
        $missing = array_diff($required, $headers);
        if ($missing) {
            fclose($handle);
            $this->error('Faltan columnas: ' . implode(', ', $missing));
            return self::FAILURE;
        }

        $rows = [];
        $codes = [];
        $line = 1;
        while (($values = fgetcsv($handle)) !== false) {
            $line++;
            if (count($values) === 1 && trim((string) $values[0]) === '') {
                continue;
            }
            if (count($values) !== count($headers)) {
                fclose($handle);
                $this->error("La línea {$line} no tiene la cantidad correcta de columnas.");
                return self::FAILURE;
            }
            $row = array_combine($headers, $values);
            $code = trim((string) $row['code']);
            if ($code === '') {
                fclose($handle);
                $this->error("La línea {$line} no tiene código.");
                return self::FAILURE;
            }
            if (isset($codes[$code])) {
                fclose($handle);
                $this->error("Código duplicado {$code} en las líneas {$codes[$code]} y {$line}.");
                return self::FAILURE;
            }
            $codes[$code] = $line;
            $rows[] = $row;
        }
        fclose($handle);

        $currencyIds = collect($rows)->pluck('currency_id')->map(fn ($id) => (int) $id)->unique();
        $knownCurrencies = DB::table('currencies')->whereIn('id', $currencyIds)->pluck('id')->map(fn ($id) => (int) $id);
        $unknownCurrencies = $currencyIds->diff($knownCurrencies);
        if ($unknownCurrencies->isNotEmpty()) {
            $this->error('currency_id inexistentes: ' . $unknownCurrencies->implode(', '));
            return self::FAILURE;
        }

        $existingCodes = Product::whereIn('code', array_keys($codes))->pluck('code');
        $updated = $existingCodes->count();
        $created = count($rows) - $updated;
        $this->info("CSV válido: " . count($rows) . " filas; {$updated} actualizarán y {$created} se agregarán.");

        if ($this->option('dry-run')) {
            $this->comment('Dry-run: no se modificó la base de datos.');
            return self::SUCCESS;
        }

        DB::transaction(function () use ($rows) {
            foreach ($rows as $row) {
                $null = static fn ($value) => in_array($value, ['', 'NULL', 'null'], true) ? null : $value;
                Product::updateOrCreate(
                    ['code' => trim($row['code'])],
                    [
                        'name' => $row['name'],
                        'description' => $null($row['description']),
                        'price' => (float) $row['price'],
                        'precio_lista' => (float) $row['precio_lista'],
                        'impuesto' => (float) $row['impuesto'],
                        'profit_margin' => (float) $row['profit_margin'],
                        'currency_id' => (int) $row['currency_id'],
                        'stock' => (int) $row['stock'],
                        'image_url' => $null($row['image_url']),
                        'distribuidor_discount_enabled' => filter_var($row['distribuidor_discount_enabled'], FILTER_VALIDATE_BOOLEAN),
                        'distribuidor_discount_percent' => (float) $row['distribuidor_discount_percent'],
                        'distribuidor_only' => filter_var($row['distribuidor_only'], FILTER_VALIDATE_BOOLEAN),
                        'visibility' => $row['visibility'],
                    ]
                );
            }
        });

        $this->info('Importación completada correctamente.');
        return self::SUCCESS;
    }
}
