import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react-router-dom', 'react', 'react-dom', '@supabase/supabase-js'],
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
});
