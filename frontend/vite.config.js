import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Build de producción escribe index.html y assets/ directamente en la raíz
// del sitio (/var/www/ferreteriad2), reemplazando el SPA compilado anterior.
// En desarrollo, /backapi se proxea al servidor local.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  publicDir: false,
  server: {
    proxy: {
      '/backapi': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../',
    emptyOutDir: false,
    assetsDir: 'assets',
  },
})
