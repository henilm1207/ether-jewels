import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  preview: { port: 3000 },
});
