import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'node tests/mock-server/mock-api-server.js',
      port: 4444,
      reuseExistingServer: true,
    },
    {
      command: 'REQPILOT_NO_OPEN=1 PORT=5489 node server.js',
      port: 5489,
      reuseExistingServer: true,
    },
    {
      command: 'npm run dev:ui',
      port: 5173,
      reuseExistingServer: true,
    },
  ],
});
