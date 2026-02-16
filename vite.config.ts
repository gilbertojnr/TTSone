import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'fix-github-pages',
          enforce: 'post',
          apply: 'build',
          transformIndexHtml(html) {
            // Remove type="module" and crossorigin attributes
            return html
              .replace(/type="module"/g, '')
              .replace(/crossorigin/g, '');
          }
        }
      ],
      base: '/TTSone/',
      // Properly expose env vars to the client
      define: {
        'import.meta.env.VITE_KIMI_API_KEY': JSON.stringify(env.VITE_KIMI_API_KEY || ''),
        'import.meta.env.VITE_MASSIVE_API_KEY': JSON.stringify(env.VITE_MASSIVE_API_KEY || ''),
        'import.meta.env.VITE_FINNHUB_API_KEY': JSON.stringify(env.VITE_FINNHUB_API_KEY || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,  // Disable source maps for production
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
        },
      }
    };
});
