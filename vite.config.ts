import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
      '@app': fileURLToPath(new URL('src/app', import.meta.url)),
      '@pages': fileURLToPath(new URL('src/pages', import.meta.url)),
      '@widgets': fileURLToPath(new URL('src/widgets', import.meta.url)),
      '@features': fileURLToPath(new URL('src/features', import.meta.url)),
      '@entities': fileURLToPath(new URL('src/entities', import.meta.url)),
      '@shared': fileURLToPath(new URL('src/shared', import.meta.url)),
    },
  },
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
