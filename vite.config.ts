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
    target: 'esnext',
    rollupOptions: {
      output: {
        // Split stable, heavy vendor libs into their own long-cached chunks so
        // the core app bundle is smaller and repeat visits re-download less.
        // Order matters here — earlier rules win.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
          if (/[\\/]node_modules[\\/](recharts|d3-|victory|internmap)/.test(id)) return 'charts';
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'supabase';
          // Lucide is 1500+ icon SVGs; even tree-shaken it can creep when many
          // files share a barrel import. Pinning it to its own chunk keeps
          // hashed cache hits across deploys (icons rarely change).
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return 'icons';
          // framer-motion is ~150KB and only used by a handful of advanced
          // surfaces (causal-twin governance, etc.) — never on the cold path.
          if (/[\\/]node_modules[\\/]framer-motion[\\/]/.test(id)) return 'framer-motion';
          // openai SDK ships generated types + retry logic. Only the chat
          // surfaces touch it.
          if (/[\\/]node_modules[\\/]openai[\\/]/.test(id)) return 'openai';
          // lodash is huge if the whole barrel makes it through. Pin it so
          // it doesn't poison the shell.
          if (/[\\/]node_modules[\\/]lodash[\\/]/.test(id)) return 'lodash';
          // WebLLM is loaded dynamically inside on-device chat — but if
          // anything ever static-imports it, this rule keeps it isolated
          // instead of merging into the shell.
          if (/[\\/]node_modules[\\/]@mlc-ai[\\/]/.test(id)) return 'web-llm';
          // Prisma client should never end up on the client; if a stray
          // import slips in, isolate it instead of poisoning the shell.
          if (/[\\/]node_modules[\\/]@prisma[\\/]/.test(id)) return 'prisma';
          return undefined;
        },
      },
    },
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
