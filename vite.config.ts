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
  server: {
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
