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
      plugins: [react()],
      base: '/TTSone/',
      define: {
        'process.env.VITE_KIMI_API_KEY': JSON.stringify(env.VITE_KIMI_API_KEY),
        'process.env.VITE_MASSIVE_API_KEY': JSON.stringify(env.VITE_MASSIVE_API_KEY),
        'process.env.VITE_FINNHUB_API_KEY': JSON.stringify(env.VITE_FINNHUB_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: true,
        // Use IIFE format instead of ES modules for GitHub Pages compatibility
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          },
          output: {
            format: 'iife',
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      }
    };
});
