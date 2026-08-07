import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import { DEV_API_BASE_URL, DEV_BASE_URL } from './e2e-integrado/constants';
import { STORAGE_STATE_FILE } from './e2e-integrado/session';
import { playwrightReporters } from './playwright.reporters';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

process.env.E2E_AUTH_MODE = process.env.E2E_AUTH_MODE ?? 'cdp';
process.env.E2E_API_BASE_URL = process.env.E2E_API_BASE_URL ?? DEV_API_BASE_URL;

const useStorage = process.env.E2E_AUTH_MODE === 'storage';
const useChrome = process.env.E2E_AUTH_MODE === 'chrome';

export default defineConfig({
  testDir: './e2e-integrado',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: playwrightReporters,
  timeout: 180_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? DEV_BASE_URL,
    ...(useStorage ? { storageState: STORAGE_STATE_FILE } : {}),
    ...(useStorage || !useChrome ? { channel: 'chrome' as const } : {}),
    headless: false,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'clientes',
      testMatch: /clientes\.integracao\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'ciclo-ouro',
      testMatch: /ciclo-ouro\.spec\.ts/,
      dependencies: ['setup', 'clientes'],
      timeout: 300_000,
    },
  ],
});
