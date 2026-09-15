import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Publish .map files for the production bundle: Lighthouse Best Practices
  // flags large first-party JS without source maps, and they make prod
  // debugging possible. Browsers fetch them only with DevTools open; the
  // deploy script's static serving already covers them (no extra config).
  build: { sourcemap: true },
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:5001',
        changeOrigin: true,
      },
      // Product/category imagery (server/lib/localImages.js) is served by
      // Express under /uploads — without this, relative /uploads/*.webp
      // paths (the default when VITE_API_URL is unset) 404 through Vite.
      '/uploads': {
        target: process.env.VITE_API_PROXY || 'http://localhost:5001',
        changeOrigin: true,
      },
    },
  },
  preview: { port: 3000 },
});
