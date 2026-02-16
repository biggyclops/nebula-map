import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiProxyTarget =
      env.VITE_API_PROXY_TARGET ||
      env.VITE_STATUS_API_TARGET ||
      'http://127.0.0.1:8000';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Proxy all /api/* to Nebula backend (main.py on 8000 by default).
        // main.py handles /api/peers, /api/stats, /api/ai/* and proxies /api/status.
        proxy: {
          '/api': {
            target: apiProxyTarget,
            changeOrigin: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
