import { defineConfig } from '@playwright/test';

import baseConfig from './playwright.config';

const inheritedTestIgnore = Array.isArray(baseConfig.testIgnore)
  ? baseConfig.testIgnore
  : baseConfig.testIgnore
    ? [baseConfig.testIgnore]
    : [];

export default defineConfig({
  ...baseConfig,
  testIgnore: [...inheritedTestIgnore, '**/ai-dock-scroll.spec.ts', '**/pc-d1-studio.spec.ts'],
});
