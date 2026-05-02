import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to 0.0.0.0 to allow LAN access (e.g. testing on iPhone/iPad)
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      exclude: [
        '**/*.css',
        '**/*.test.*',
        '**/*.property.*',
        '**/test/**',
        '**/types/**',
        '**/vite-env.d.ts',
        '**/TablatureViewer.tsx',
      ],
    },
  },
});
