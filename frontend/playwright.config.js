import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    viewport: { width: 375, height: 812 }, // Mobile-first (iPhone)
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: process.env.TEST_URL ? undefined : {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
});
