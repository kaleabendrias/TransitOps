import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@domain': path.resolve(__dirname, './src/domain'),
      '@adapters': path.resolve(__dirname, './src/adapters'),
      '@services': path.resolve(__dirname, './src/services'),
      '@presentation': path.resolve(__dirname, './src/presentation'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
});
