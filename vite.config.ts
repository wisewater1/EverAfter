import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['zod'],
    esbuildOptions: {
      resolveExtensions: ['.js', '.ts', '.jsx', '.tsx', '.json'],
    },
  },
  build: {
    target: 'esnext'
  },
  server: {
    port: 5000,
    strictPort: true,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8010',
        ws: true,
      },
    },
    hmr: {
      overlay: true,
    },
    fs: {
      strict: false,
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    conditions: ['import', 'module', 'browser', 'default'],
  },
  clearScreen: false,
});
