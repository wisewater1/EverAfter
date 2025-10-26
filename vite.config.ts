import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Force cache clear - updated at 2025-10-20 10:04:20
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react-router-dom', 'react', 'react-dom', '@supabase/supabase-js', 'zod'],
    force: true,
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
  },
  clearScreen: false,
});
