import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const NEON_AUTH_TARGET = 'https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build') {
    if (!env.VITE_API_BASE_URL || !env.VITE_NEON_AUTH_URL) throw new Error('Set VITE_API_BASE_URL and VITE_NEON_AUTH_URL explicitly before building.');
    for (const name of ['VITE_API_BASE_URL', 'VITE_NEON_AUTH_URL']) {
      const value = env[name];
      if (value.startsWith('/') && !value.startsWith('//')) continue;
      const url = new URL(value);
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error(`${name} requires HTTPS or an explicit same-origin route.`);
    }
  }
  return {
  plugins: [react()],
  server: {
    proxy: {
      '/health': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Neon Auth requests so cookies are same-origin (fixes Google OAuth locally)
      '/neon-auth': {
        target: NEON_AUTH_TARGET,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/neon-auth/, '/neondb/auth'),
        configure: (proxy) => {
          // Forward set-auth-jwt header to the browser
          proxy.on('proxyRes', (proxyRes) => {
            const jwt = proxyRes.headers['set-auth-jwt'];
            if (jwt) {
              proxyRes.headers['access-control-expose-headers'] = 'set-auth-jwt';
            }
          });
        },
      },
    }
  }
  };
});
