import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'DukaBook - POS System',
            short_name: 'DukaBook',
            description: 'Kenya\'s Smart Point of Sale System with Offline Support',
            theme_color: '#1e40af',
            background_color: '#0f172a',
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: 'icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/.*supabase\.co\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 // 24 hours
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
        'import.meta.env.VITE_INTASEND_PUBLIC_KEY': JSON.stringify(env.VITE_INTASEND_PUBLIC_KEY || process.env.VITE_INTASEND_PUBLIC_KEY),
        'import.meta.env.VITE_INTASEND_SECRET_KEY': JSON.stringify(env.VITE_INTASEND_SECRET_KEY || process.env.VITE_INTASEND_SECRET_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
