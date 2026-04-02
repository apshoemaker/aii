import { defineConfig } from 'vite';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5199,
    host: '0.0.0.0',
    proxy: {
      '/api/horizons': {
        target: 'https://ssd.jpl.nasa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/horizons/, '/api/horizons.api'),
      },
      '/ws': {
        target: BACKEND_URL,
        ws: true,
      },
    },
  },
});
