import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        director: resolve(__dirname, 'director.html'),
        sistemas: resolve(__dirname, 'sistemas.html'),
        entidades: resolve(__dirname, 'entidades.html')
      }
    }
  }
});
