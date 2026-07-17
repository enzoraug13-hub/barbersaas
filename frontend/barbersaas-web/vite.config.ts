import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // PWA: instalabilidade + precache dos assets do build (js/css/ícones), nada
    // além disso. NÃO cachear API/uploads — dado financeiro/agenda servido de
    // cache seria informação errada; o app depende do backend.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Trimly',
        short_name: 'Trimly',
        description: 'Gestão e agendamento para barbearias',
        start_url: '/admin',
        display: 'standalone',
        background_color: '#030712',
        theme_color: '#eab308',
        orientation: 'portrait-primary',
        lang: 'pt-BR',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA: navegações caem no index.html do precache — MENOS api/uploads/
        // hangfire/swagger, que são do backend e nunca devem responder do SW.
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//, /^\/hangfire/, /^\/swagger/],
        // Sem runtimeCaching: só o precache dos assets do build. Chunks antigos
        // são limpos automaticamente a cada deploy (cleanupOutdatedCaches default).
      },
    }),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'use-sync-external-store'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // imagens enviadas (logo/capa) servidas pela API a partir de wwwroot/uploads
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
