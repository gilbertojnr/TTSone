import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // Also check process.env for CI/CD builds (GitHub Actions)
    const getEnv = (key: string) => {
        return env[key] || process.env[key] || '';
    };
    
    return {
      server: {
        port: 5173,
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
      base: mode === 'production' ? '/TTSone/' : '/',
      // Replace env vars with actual values at build time
      define: {
        '__KIMI_API_KEY__': JSON.stringify(getEnv('VITE_KIMI_API_KEY')),
        '__MASSIVE_API_KEY__': JSON.stringify(getEnv('VITE_MASSIVE_API_KEY')),
        '__FINNHUB_API_KEY__': JSON.stringify(getEnv('VITE_FINNHUB_API_KEY')),
        '__FIREBASE_API_KEY__': JSON.stringify(getEnv('VITE_FIREBASE_API_KEY')),
        '__GEMINI_API_KEY__': JSON.stringify(getEnv('VITE_GEMINI_API_KEY')),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
          output: {
            format: 'iife',
            entryFileNames: 'assets/app.js',
            chunkFileNames: 'assets/[name].js',
            assetFileNames: 'assets/[name][extname]',
            inlineDynamicImports: true,
          },
        },
      }
    };
});
