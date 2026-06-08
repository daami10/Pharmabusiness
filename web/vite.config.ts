import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // En dev, /api/scan no existe localmente (es una función serverless). Define
  // VITE_API_PROXY_TARGET=https://<deploy> para probar el OCR contra ella.
  server: {
    proxy: process.env.VITE_API_PROXY_TARGET
      ? { '/api': { target: process.env.VITE_API_PROXY_TARGET, changeOrigin: true } }
      : undefined,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    // Valores ficticios para que los módulos que importan el cliente Supabase
    // no fallen al cargarse en los tests (no se hacen llamadas reales).
    env: {
      VITE_SUPABASE_URL: 'http://localhost:54321',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
})
