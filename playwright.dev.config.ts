import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { DEV_API_BASE_URL, DEV_BASE_URL } from './e2e-integrado/constants';
import { STORAGE_STATE_FILE } from './e2e-integrado/session';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

process.env.E2E_AUTH_MODE = 'storage';
process.env.E2E_API_BASE_URL = process.env.E2E_API_BASE_URL ?? DEV_API_BASE_URL;

export default defineConfig({
  testDir: './e2e-integrado',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  timeout: 180_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? DEV_BASE_URL,
    storageState: STORAGE_STATE_FILE,
    channel: 'chrome',
    headless: process.env.PW_HEADLESS === '1',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_SLOW_MO
      ? { slowMo: Number(process.env.PW_SLOW_MO) }
      : undefined,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'dev',
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/],
    },
  ],
});
