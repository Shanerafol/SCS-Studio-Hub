
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],

  // Use the correct base path for each environment:
  // Local development: /
  // Vercel: /
  // GitHub Pages: /SCS-Studio-Hub/
  base: process.env.VERCEL
    ? '/'
    : command === 'serve'
      ? '/'
      : '/SCS-Studio-Hub/',

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
}));
