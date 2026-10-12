#!/usr/bin/env bash
# =============================================================================
# deploy.sh — Despliegue / actualización de Ferretería De2 en el VPS
# -----------------------------------------------------------------------------
# Uso (en el servidor, como root o con permisos sobre /var/www/ferreteriad2):
#
#     ./deploy.sh
#
# Qué hace, en orden:
#   1. Trae el último código del repositorio (git pull).
#   2. Instala las dependencias de PHP (composer install, sin dev).
#   3. Aplica las migraciones pendientes de Laravel (nunca borra datos).
#   4. Regenera la caché de Laravel (config, rutas y vistas).
#   5. Corrige permisos/ownership (www-data) por si el pull corrió como root.
#
# NOTAS:
#   * El FRONTEND NO se compila acá: el build de Vite ya viene commiteado en el
#     repo (index.html + assets/). Si cambiás el frontend, recompilá en tu máquina
#     local con `cd frontend && npm run build` ANTES de commitear.
#   * `composer install` se corre siempre (es rápido e idempotente: si no cambió
#     composer.lock, no reinstala nada).
#   * `migrate --force` es obligatorio en producción (APP_ENV=production).
# =============================================================================

# Detiene el script ante cualquier error y evita variables sin definir.
set -euo pipefail

# -----------------------------------------------------------------------------
# Configuración (ajustá las rutas si tu instalación está en otro lado)
# -----------------------------------------------------------------------------
APP_DIR="/var/www/ferreteriad2"        # raíz del sitio (donde está el repo)
BACKEND_DIR="$APP_DIR/backapi"         # carpeta de la API Laravel
WEB_USER="www-data"                    # usuario del servidor web (Apache/Nginx)

# -----------------------------------------------------------------------------
# 1) Código: traer lo último de GitHub
# -----------------------------------------------------------------------------
echo "==> [1/5] Actualizando código (git pull)…"
cd "$APP_DIR"
# Evita "detected dubious ownership" si el repo quedó de otro dueño (ej. www-data)
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git pull

# -----------------------------------------------------------------------------
# 2) Dependencias de PHP (Laravel)
# -----------------------------------------------------------------------------
echo "==> [2/5] Instalando dependencias PHP (composer)…"
cd "$BACKEND_DIR"
composer install --no-dev --no-interaction --optimize-autoloader

# -----------------------------------------------------------------------------
# 3) Base de datos: migraciones pendientes
# -----------------------------------------------------------------------------
echo "==> [3/5] Aplicando migraciones pendientes…"
php artisan migrate --force

# -----------------------------------------------------------------------------
# 4) Caché de Laravel (config, rutas, vistas)
# -----------------------------------------------------------------------------
echo "==> [4/5] Regenerando caché…"
php artisan config:cache
php artisan route:cache
php artisan view:cache

# -----------------------------------------------------------------------------
# 5) Permisos: que www-data sea dueño y pueda escribir storage/cache
# -----------------------------------------------------------------------------
echo "==> [5/5] Corrigiendo permisos…"
chown -R "$WEB_USER:$WEB_USER" "$APP_DIR"
chmod -R 775 "$BACKEND_DIR/storage" "$BACKEND_DIR/bootstrap/cache"

echo ""
echo "==> Listo. El sitio quedó actualizado."
