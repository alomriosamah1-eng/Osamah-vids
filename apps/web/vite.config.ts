import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  root: '.',
  plugins: [react()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://127.0.0.1:8799',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@osamah/core': resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
});