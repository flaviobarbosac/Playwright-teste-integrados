import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { DEFAULT_API_BASE_URL } from './e2e-integrado/constants';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const frontDir = process.env.CLAMPFY_FRONT_DIR ?? path.resolve(rootDir, '../prosiffionaisliberais-front');
const apiDir = process.env.CLAMPFY_API_DIR ?? path.resolve(rootDir, '../profissionaisliberais');
const apiBaseUrl = process.env.E2E_API_BASE_URL ?? DEFAULT_API_BASE_URL;
const apiOrigin = apiBaseUrl.replace(/\/api\/v1\/?$/i, '');
const prereqScript = path.join(rootDir, 'scripts', 'ensure-prerequisites.mjs');

const e2eEnv = {
  CLAMPFY_E2E: 'true',
  E2E__Enabled: 'true',
  ASPNETCORE_ENVIRONMENT: 'Development',
  ASAAS_E2E_API_KEY: process.env.ASAAS_E2E_API_KEY ?? '',
};

export default defineConfig({
  testDir: './e2e-integrado',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  timeout: 180_000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_SLOW_MO
      ? { slowMo: Number(process.env.PW_SLOW_MO) }
      : undefined,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'integrado',
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `node "${prereqScript}" && dotnet build Clampfy.API/Clampfy.API.csproj -v q && dotnet run --project Clampfy.API/Clampfy.API.csproj --no-build --launch-profile Development --urls http://127.0.0.1:5080`,
      cwd: apiDir,
      url: `${apiOrigin}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 600_000,
      env: e2eEnv,
    },
    {
      command: 'dotnet build Clampfy.Worker/Clampfy.Worker.csproj -v q && dotnet run --project Clampfy.Worker/Clampfy.Worker.csproj --no-build',
      cwd: apiDir,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: e2eEnv,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5173',
      cwd: frontDir,
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: apiBaseUrl,
        VITE_GOOGLE_CLIENT_ID: process.env.VITE_GOOGLE_CLIENT_ID ?? '',
        VITE_ADMIN_ENABLED: 'true',
        VITE_ADMIN_ENVIRONMENT: 'dev',
        VITE_ADS_ENABLED: 'false',
      },
    },
  ],
});
