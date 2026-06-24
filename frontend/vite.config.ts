import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

const NEON_AUTH_TARGET = 'https://ep-green-glade-ajuf7urf.neonauth.c-3.us-east-2.aws.neon.tech';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
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
})
