import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 5000,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png', 'pwa-192x192.png'],
        manifest: {
          name: 'EduSuite Systems',
          short_name: 'EduSuite',
          description: 'Professional school report card management system',
          theme_color: '#0052CC',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // Increase limit to 5MB
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              method: 'POST',
              handler: 'NetworkOnly',
              options: {
                backgroundSync: {
                  name: 'post-mutation-queue',
                  options: {
                    maxRetentionTime: 24 * 60 // 24 hours
                  }
                }
              }
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              method: 'PUT',
              handler: 'NetworkOnly',
              options: {
                backgroundSync: {
                  name: 'put-mutation-queue',
                  options: {
                    maxRetentionTime: 24 * 60 // 24 hours
                  }
                }
              }
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              method: 'DELETE',
              handler: 'NetworkOnly',
              options: {
                backgroundSync: {
                  name: 'delete-mutation-queue',
                  options: {
                    maxRetentionTime: 24 * 60 // 24 hours
                  }
                }
              }
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 24 hours
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      }),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './setupTests.ts', // Will create this file
      css: true,
      coverage: {
        provider: 'v8', // or 'istanbul'
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'server/', 'migrations/', 'dist/', 'public/', 'scripts/', '**/*.cjs'],
      },
      deps: {
        inline: ['@tanstack/react-query'], // Required for react-query in tests
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@assets': path.resolve(__dirname, 'attached_assets'),
      }
    }
  };
});
