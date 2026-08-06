import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, type BrowserContext } from '@playwright/test';
import { DEV_BASE_URL } from '../constants';
import { ensureClampfyLogin } from '../utils/google-login';

const profileDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '.chrome-profile',
);

export const test = base.extend<{}, { chromeContext: BrowserContext }>({
  chromeContext: [
    async ({ playwright }, use) => {
      const context = await playwright.chromium.launchPersistentContext(profileDir, {
        channel: 'chrome',
        headless: false,
        viewport: null,
      });
      await use(context);
      await context.close();
    },
    { scope: 'worker' },
  ],

  context: async ({ chromeContext }, use) => {
    await use(chromeContext);
  },

  page: async ({ context, baseURL }, use) => {
    const page = await context.newPage();
    await ensureClampfyLogin(page, baseURL ?? DEV_BASE_URL);
    await use(page);
    await page.close();
  },
});
