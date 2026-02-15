import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Headers de seguridad para desarrollo
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    build: {
      outDir: 'dist',
      // Solo generar sourcemaps en desarrollo
      sourcemap: mode === 'development',
      // Generar hashes para cache busting
      rollupOptions: {
        output: {
          entryFileNames: 'js/[name]-[hash].js',
          chunkFileNames: 'js/[name]-[hash].js',
          assetFileNames: (info) => {
            const infoType = info.name?.split('.').at(1)
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(infoType || '')) {
              return 'img/[name]-[hash][extname]'
            }
            if (/css/i.test(infoType || '')) {
              return 'css/[name]-[hash][extname]'
            }
            return '[name]-[hash][extname]'
          },
        },
      },
    },
    // Definir variables de entorno para el cliente
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  }
})
