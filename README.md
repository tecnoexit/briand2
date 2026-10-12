# Ferretería De2 — sitio + API

Sistema completo de la ferretería: **SPA en React (Vite) + API en Laravel 12**.
Pensado para clonar en un VPS Debian/Ubuntu y dejarlo andando con la base de datos ya cargada.

```
/
├── index.html               # SPA compilado (lo genera `npm run build` del frontend)
├── assets/                  # JS + CSS compilados del SPA
├── .htaccess                # SPA: todo lo que no sea archivo → index.html
├── frontend/                # FUENTE del frontend (React + Vite + Tailwind)
│   ├── src/                 #   páginas, componentes, api, lib
│   ├── package.json
│   └── vite.config.js       #   build escribe en la raíz (../) y assets/
├── database/
│   └── ferreteria.sql       # dump de la BD de negocio (productos, clientes, facturas…)
├── backapi/                 # API Laravel 12
│   ├── app/                 #   controllers, models, middleware
│   ├── routes/              #   api.php (rutas + roles)
│   ├── database/migrations/ #   migraciones
│   ├── storage/app/public/products/   # 9690 fotos de productos (incluidas)
│   ├── .env.example         #   plantilla de entorno
│   └── .htaccess            #   rutea /backapi/* → public/ + bloquea archivos sensibles
├── instalar.sh              # instalación asistida (Debian/Ubuntu)
└── README.md
```

- La API se sirve en `/backapi/api` y el SPA se sirve en la raíz `/`.
- La URL de la API va embebida en los bundles como `/backapi` (relativa al host).

---

## Requisitos

| | |
|---|---|
| PHP | **8.4** (también 8.3) con `mysql pdo_mysql mbstring openssl curl fileinfo zip bcmath xml dom intl tokenizer gd` |
| Composer | 2.x |
| Node | 20+ (solo para compilar el frontend) |
| BD | MariaDB 10.11+ / 11.x o MySQL 8 |
| Web | Apache 2.4 con `mod_rewrite` (los `.htaccess` ya están listos) o Nginx (ver abajo) |

`gd` es obligatorio: la API redimensiona imágenes de productos con `imagecreatefromjpeg/png/gif/webp`.

Instalación de dependencias del sistema (Debian 12/13 o Ubuntu con repo de PHP):

```bash
apt update && apt install -y ca-certificates curl gnupg lsb-release unzip mariadb-server
curl -sSLo /usr/share/keyrings/deb.sury.org-php.gpg https://packages.sury.org/php/apt.gpg
echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" \
  > /etc/apt/sources.list.d/php.list
apt update
apt install -y apache2 libapache2-mod-php8.4 php8.4 php8.4-mysql php8.4-mbstring php8.4-xml \
  php8.4-curl php8.4-gd php8.4-zip php8.4-bcmath php8.4-intl composer
a2enmod rewrite headers expires
```

---

## Instalación

### Opción A — script asistido

```bash
git clone https://github.com/tecnoexit/briand2.git /var/www/ferreteriad2
cd /var/www/ferreteriad2
chmod +x instalar.sh
sudo ./instalar.sh --deps      # instala paquetes (solo la primera vez)
./instalar.sh                  # composer, .env, permisos, symlink, caché
```

### Opción B — manual

```bash
git clone https://github.com/tecnoexit/briand2.git /var/www/ferreteriad2
cd /var/www/ferreteriad2

# 1) dependencias PHP (no sube vendor/ al repo: se instala acá)
composer install --no-dev --optimize-autoloader

# 2) entorno
cp backapi/.env.example backapi/.env
nano backapi/.env
```

En `.env` completá:

```dotenv
APP_URL=https://TUDOMINIO.com/backapi   # arma las URLs de las imágenes con esto
APP_KEY=                                 # ver nota de abajo
DB_DATABASE=ferreteria
DB_USERNAME=ferreteria_app
DB_PASSWORD=<una password>
```

> **`APP_KEY`**: si el servidor reemplaza a uno en producción, **copiá la `APP_KEY` que ya
> tenés y no corras `key:generate`** (regenerarla invalida todos los tokens Sanctum y
> obliga a todo el mundo a volver a entrar). Solo corré `php artisan key:generate` si es
> una **instalación nueva desde cero**.

```bash
# 3) permisos + symlink de storage (sin esto todas las fotos dan 404)
chown -R www-data:www-data /var/www/ferreteriad2
find /var/www/ferreteriad2 -type d -exec chmod 755 {} \;
find /var/www/ferreteriad2 -type f -exec chmod 644 {} \;
chmod -R 775 backapi/storage backapi/bootstrap/cache
ln -s ../storage/app/public backapi/public/storage

# 4) base de datos (ver sección siguiente) y caché
cd backapi
php artisan config:cache && php artisan route:cache && php artisan view:cache
php artisan up
```

---

## Base de datos (ya cargada)

El repo incluye un dump de la base de negocio en **`database/ferreteria.sql`**
(productos, clientes, facturas, presupuestos, usuarios). Para cargarla:

```bash
# crear BD y usuario de la app
mariadb -u root -e "CREATE DATABASE ferreteria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ferreteria_app'@'localhost' IDENTIFIED BY '<pass>';
GRANT ALL ON ferreteria.* TO 'ferreteria_app'@'localhost'; FLUSH PRIVILEGES;"

# importar el dump
mariadb -u root ferreteria < database/ferreteria.sql
```

> El dump incluye la tabla `migrations`, por lo que la BD queda al día con el código.
> Si después traés código nuevo con migraciones, corré `php artisan migrate --force`.

Si preferís una BD vacía (sin datos):

```bash
cd backapi && php artisan migrate --seed
```

> **Contraseñas de usuarios**: el dump trae los usuarios con sus hashes. Si no conocés
> las claves, resetéalas con `php artisan tinker` o el seeder.

---

## Compilar el frontend (build)

El frontend **sí** está versionado en `frontend/`. Para recompilarlo:

```bash
cd frontend
npm install
npm run build        # escribe index.html + assets/ directamente en la raíz del repo
```

`vite.config.js` tiene `outDir: '../'` y `emptyOutDir: false`, así el build reemplaza el
SPA compilado de la raíz (`index.html` + `assets/`) sin borrar nada más.

Para desarrollo con hot-reload (proxea `/backapi` al server local):

```bash
cd frontend && npm run dev
```

---

## VirtualHost (Apache)

```apache
<VirtualHost *:80>
    ServerName tudominio.com
    ServerAlias www.tudominio.com
    DocumentRoot /var/www/ferreteriad2

    <Directory /var/www/ferreteriad2>
        Options -Indexes +FollowSymLinks
        AllowOverride All          # obligatorio: sin esto no se leen los .htaccess
        Require all granted
    </Directory>

    ErrorLog  ${APACHE_LOG_DIR}/ferreteriad2-error.log
    CustomLog ${APACHE_LOG_DIR}/ferreteriad2-access.log combined
</VirtualHost>
```

```bash
a2ensite ferreteriad2 && a2dissite 000-default && systemctl reload apache2
apt install -y certbot python3-certbot-apache
certbot --apache -d tudominio.com -d www.tudominio.com
```

### Equivalente en Nginx (los `.htaccess` se ignoran)

```nginx
root /var/www/ferreteriad2;
index index.html;

location / { try_files $uri $uri/ /index.html; }          # SPA

location ^~ /backapi/ {
    alias /var/www/ferreteriad2/backapi/public/;
    try_files $uri $uri/ /backapi/index.php?$query_string;

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/ferreteriad2/backapi/public/index.php;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
    }
}

location ^~ /backapi/storage/ {
    alias /var/www/ferreteriad2/backapi/public/storage/;
    expires 30d;
    access_log off;
}
```

### `php.ini`

```ini
memory_limit = 512M          # las imágenes suben en base64 dentro del POST
post_max_size = 64M
upload_max_filesize = 32M
max_execution_time = 120
expose_php = Off
display_errors = Off
date.timezone = UTC
```

---

## Verificación post-instalación

```bash
curl -so /dev/null -w "%{http_code}\n" http://localhost/                     # 200 SPA
curl -so /dev/null -w "%{http_code}\n" http://localhost/admin                # 200 (fallback SPA)
curl -so /dev/null -w "%{http_code}\n" http://localhost/backapi/up           # 200 Laravel
curl -so /dev/null -w "%{http_code}\n" http://localhost/backapi/.env         # 403 (bloqueado)
curl -so /dev/null -w "%{http_code}\n" http://localhost/backapi/storage/products/<id>.jpg  # 200

curl -s -H "Accept: application/json" -H "Content-Type: application/json" \
  -X POST http://localhost/backapi/api/login \
  -d '{"email":"admin@sys.com","password":"tu-password"}'                     # 200 + token
```

---

## Flujo de trabajo / versionado

```bash
cd /var/www/ferreteriad2
git pull

# backend (si cambió)
composer install --no-dev --optimize-autoloader
cd backapi && php artisan migrate --force

# frontend (si cambió)
cd ../frontend && npm install && npm run build

# caché de Laravel
cd ../backapi && php artisan config:cache && php artisan route:cache && php artisan view:cache

# permisos (si el build corrió como otro usuario)
chown -R www-data:www-data /var/www/ferreteriad2
```

---

## Cosas a tener en cuenta

- **La URL de la API está embebida en los bundles JS como `/backapi`** (relativa al host).
  Funciona con cualquier dominio **mientras el sitio esté en la raíz**. Si lo acomodás en
  una subcarpeta hay que tocar `RewriteBase` del `.htaccess` raíz, las rutas absolutas de
  `index.html` y el `basename` del router (`/`, `/admin`, `/vendedor`, `/deposito`, `/client`).
- **`backapi/.htaccess` bloquea `.env`, `app/`, `config/`, `vendor/`, `database/`… con 403.**
  No lo quites: sin esa regla `/backapi/.env` entrega la APP_KEY y la password de la BD.
- **`frontend/` está bloqueado por HTTP (403)** desde el `.htaccess` raíz: el navegador no
  debe servir el source de React, solo el build de la raíz.
- **Colas y cron**: no hacen falta. No hay `dispatch()` ni `Schedule` en el código.
- **Backups**: `mysqldump` de la BD **y** de `backapi/storage/app/public/` (303 MB de fotos
  que no están en el dump SQL).
