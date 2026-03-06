import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy': {
        target: 'http://localhost:5489',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:5489',
        changeOrigin: true,
      },
    },
  },
});
