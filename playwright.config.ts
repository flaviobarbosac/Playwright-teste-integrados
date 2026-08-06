import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const frontDir = process.env.CLAMPFY_FRONT_DIR ?? path.resolve(rootDir, '../prosiffionaisliberais-front');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  timeout: 5_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_SLOW_MO
      ? { slowMo: Number(process.env.PW_SLOW_MO) }
      : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    cwd: frontDir,
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? 'https://api.dev.clampfy.com/api/v1',
      VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID ?? '',
      VITE_ADMIN_ENABLED: 'true',
      VITE_ADMIN_ENVIRONMENT: 'dev',
      VITE_ADS_ENABLED: 'false',
    },
  },
});
