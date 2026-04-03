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
      '/api/dsn': {
        target: 'https://eyes.nasa.gov',
        changeOrigin: true,
        rewrite: () => '/dsn/data/dsn.xml',
      },
      '/api/tdrs': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: () => '/NORAD/elements/gp.php?GROUP=tdrss&FORMAT=json',
      },
    },
  },
});
