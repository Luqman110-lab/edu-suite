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
      // VitePWA({ ... }) disabled for debugging
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
