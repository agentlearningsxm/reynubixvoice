import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      tailwindcss(),
      react(),
      checker({
        typescript: true,
      }),
      mode === 'analyze' &&
        visualizer({
          open: true,
          filename: 'dist/bundle-stats.html',
          gzipSize: true,
        }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'framer-motion': ['framer-motion'],
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            monitoring: [
              '@sentry/react',
              '@vercel/analytics',
              '@vercel/speed-insights',
            ],
            'voice-sdk': ['@google/genai'],
            'data-sdk': ['@supabase/supabase-js', 'zustand'],
            'ui-icons': ['lucide-react'],
          },
        },
      },
    },
  };
});
