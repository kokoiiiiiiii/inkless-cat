import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost',
        },
      },
      globals: true,
      setupFiles: './vitest.setup.ts',
    },
  }),
);
