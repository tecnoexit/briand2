#!/usr/bin/env bash
#
# Instalación del sitio Ferretería De2 en Debian/Ubuntu
#
#   ./instalar.sh            # composer + .env + permisos + symlink + caché
#   sudo ./instalar.sh --deps  # además instala los paquetes del sistema (solo 1ra vez)
#
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP="$RAIZ/backapi"
PHP_BIN="${PHP_BIN:-php}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"
WWW_USER="${WWW_USER:-www-data}"

ok()   { printf '  \033[32mOK\033[0m  %s\n' "$*"; }
aviso(){ printf '  \033[33m!!\033[0m  %s\n' "$*"; }
err()  { printf '  \033[31mX \033[0m  %s\n' "$*" >&2; }

# ---------------------------------------------------------------- dependencias
instalar_deps() {
    if [ "$(id -u)" -ne 0 ]; then
        err "--deps hay que correrlo como root:  sudo ./instalar.sh --deps"
        exit 1
    fi
    echo "== Paquetes del sistema =="
    export DEBIAN_FRONTEND=noninteractive

    if ! command -v apt-get >/dev/null 2>&1; then
        err "Este script es para Debian/Ubuntu (apt)."
        exit 1
    fi

    apt-get update -qq

    # Repo de PHP (Debian/Ubuntu no traen PHP 8.4)
    if ! apt-cache show php8.4 >/dev/null 2>&1; then
        apt-get install -y -qq ca-certificates curl gnupg lsb-release
        curl -sSLo /usr/share/keyrings/deb.sury.org-php.gpg https://packages.sury.org/php/apt.gpg
        echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" \
            > /etc/apt/sources.list.d/php.list
        apt-get update -qq
    fi

    apt-get install -y -qq apache2 mariadb-server unzip git \
        libapache2-mod-php8.4 php8.4 php8.4-mysql php8.4-mbstring php8.4-xml \
        php8.4-curl php8.4-gd php8.4-zip php8.4-bcmath php8.4-intl
    a2enmod -q rewrite headers expires || true

    if ! command -v "$COMPOSER_BIN" >/dev/null 2>&1; then
        apt-get install -y -qq composer || {
            curl -sS https://getcomposer.org/installer -o /tmp/composer-setup.php
            php /tmp/composer-setup.php --install-dir=/usr/local/bin --filename=composer
            rm -f /tmp/composer-setup.php
        }
    fi
    ok "paquetes instalados"
}

# ---------------------------------------------------------------- verificaciones
chequear_requisitos() {
    echo "== Requisitos =="
    command -v "$PHP_BIN" >/dev/null 2>&1 || { err "no encontré php (seteá PHP_BIN=...)"; exit 1; }
    command -v "$COMPOSER_BIN" >/dev/null 2>&1 || { err "no encontré composer (seteá COMPOSER_BIN=...)"; exit 1; }

    local ver
    ver="$("$PHP_BIN" -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
    ok "PHP $ver"

    local ext faltan=""
    for ext in pdo_mysql mbstring openssl curl fileinfo zip bcmath dom gd; do
        "$PHP_BIN" -m 2>/dev/null | grep -qi "^${ext}$" || faltan="$faltan $ext"
    done
    if [ -n "$faltan" ]; then
        err "faltan extensiones de PHP:$faltan"
        exit 1
    fi
    ok "extensiones de PHP"

    case "$ver" in
        8.4*|8.5*) ;;
        8.3*) aviso "PHP 8.3: el composer.lock tiene paquetes que piden 8.4. Si falla, usá: composer config platform-check false && composer install --no-dev --ignore-platform-req=php" ;;
        *)    aviso "PHP $ver es viejo para este proyecto (recomendado: 8.4)" ;;
    esac
}

# ---------------------------------------------------------------- código / vendor
instalar_vendor() {
    echo "== Composer =="
    if [ -d "$APP/vendor" ]; then
        ok "vendor/ ya existe (skip). Borrá backapi/vendor si querés reinstalar."
    else
        (cd "$APP" && "$COMPOSER_BIN" install --no-dev --optimize-autoloader --no-interaction)
        ok "vendor/ instalado"
    fi
}

# ---------------------------------------------------------------- .env
configurar_env() {
    echo "== Entorno (.env) =="
    if [ -f "$APP/.env" ]; then
        ok ".env ya existe (no lo toco)"
    else
        cp "$APP/.env.example" "$APP/.env"
        chmod 640 "$APP/.env"
        ok ".env creado desde .env.example"
    fi

    if ! grep -q '^APP_KEY=base64:' "$APP/.env"; then
        aviso "APP_KEY vacía en $APP/.env"
        aviso "  · instalación NUEVA:  php artisan key:generate"
        aviso "  · migración desde producción: pegá ahí la APP_KEY anterior (NO la regeneres)"
    else
        ok "APP_KEY presente"
    fi

    if grep -q '^APP_URL=https://tudominio.com' "$APP/.env"; then
        aviso "APP_URL sigue con el placeholder: editá $APP/.env (APP_URL, DB_DATABASE, DB_USERNAME, DB_PASSWORD)"
    fi
}

# ---------------------------------------------------------------- storage
symlink_storage() {
    echo "== storage =="
    if [ -L "$APP/public/storage" ]; then
        ok "public/storage ya es symlink -> $(readlink "$APP/public/storage")"
    elif [ -e "$APP/public/storage" ]; then
        err "$APP/public/storage existe y NO es un symlink. Borralo y volvé a correr el script."
        exit 1
    else
        ln -s ../storage/app/public "$APP/public/storage"
        ok "symlink public/storage -> ../storage/app/public"
    fi
    [ -d "$APP/storage/app/public/products" ] \
        && ok "fotos de productos: $(find "$APP/storage/app/public/products" -type f | wc -l) archivos"
}

# ---------------------------------------------------------------- permisos
permisos() {
    echo "== Permisos =="
    local dirmodes filemodes
    dirmodes="$(find "$RAIZ" -type d -exec chmod 755 {} + 2>/dev/null; true)"
    filemodes="$(find "$RAIZ" -type f -exec chmod 644 {} + 2>/dev/null; true)"
    chmod 644 "$APP/.env" 2>/dev/null || true
    chmod -R 775 "$APP/storage" "$APP/bootstrap/cache" 2>/dev/null || true
    _=$dirmodes; _=$filemodes

    if [ "$(id -u)" -eq 0 ] && id "$WWW_USER" >/dev/null 2>&1; then
        chown -R "$WWW_USER:$WWW_USER" "$RAIZ"
        chmod 640 "$APP/.env"
        ok "owner = $WWW_USER (Apache/FPM puede escribir en storage/)"
    else
        aviso "no soy root: corré 'sudo chown -R $WWW_USER:$WWW_USER $RAIZ' después"
    fi
}

# ---------------------------------------------------------------- caché Laravel
cache_laravel() {
    echo "== Laravel =="
    (cd "$APP" && "$PHP_BIN" artisan config:cache >/dev/null \
        && "$PHP_BIN" artisan route:cache >/dev/null \
        && "$PHP_BIN" artisan view:cache >/dev/null \
        && "$PHP_BIN" artisan up >/dev/null 2>&1 || true)
    if (cd "$APP" && "$PHP_BIN" artisan about --only=environment >/dev/null 2>&1); then
        ok "config/route cache + artisan OK"
    else
        aviso "artisan no responde: revisá .env (DB_*), o corré: php artisan config:clear"
    fi
}

# ---------------------------------------------------------------- resumen
resumen() {
    cat <<EOF

Listo. Falta lo manual:

  1) Base de datos (el dump NO viene en el repo, es privado):
       mariadb -u root -e "CREATE DATABASE ferreteria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
         CREATE USER 'ferreteria_app'@'localhost' IDENTIFIED BY '<pass>';
         GRANT ALL ON ferreteria.* TO 'ferreteria_app'@'localhost';"
       mariadb -u root ferreteria < respaldo.sql
       cd backapi && php artisan migrate:status     # debe decir "Ran" en todo

  2) Revisá backapi/.env: APP_URL, DB_DATABASE, DB_USERNAME, DB_PASSWORD

  3) VirtualHost con DocumentRoot = $RAIZ y AllowOverride All (ver README.md),
     luego:  a2ensite ferreteriad2 && a2dissite 000-default && systemctl reload apache2

  4) Verificación:
       curl -so /dev/null -w "%{http_code}\n" http://localhost/backapi/up      # 200
       curl -so /dev/null -w "%{http_code}\n" http://localhost/backapi/.env    # 403
       curl -so /dev/null -w "%{http_code}\n" http://localhost/                # 200

EOF
}

# ---------------------------------------------------------------- main
if [ "${1:-}" = "--deps" ]; then
    instalar_deps
    exit 0
fi

chequear_requisitos
instalar_vendor
configurar_env
symlink_storage
permisos
cache_laravel
resumen
