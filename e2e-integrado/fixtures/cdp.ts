import { test as base, type Browser } from '@playwright/test';
import { getCdpUrl } from '../session';
import { gotoApp } from '../utils/app-url';

export const test = base.extend<{}, { cdpBrowser: Browser }>({
  cdpBrowser: [
    async ({ playwright }, use) => {
      const endpoint = getCdpUrl();
      try {
        const browser = await playwright.chromium.connectOverCDP(endpoint);
        await use(browser);
      } catch (error) {
        throw new Error(
          `Não conectou ao Chrome E2E em ${endpoint}.\n` +
            'Feche todos os Chromes e abra pelo ícone "Chrome E2E" na barra de tarefas.\n' +
            'Depois faça login em https://www.dev.clampfy.com e rode os testes de novo.\n\n' +
            (error instanceof Error ? error.message : String(error)),
        );
      }
    },
    { scope: 'worker' },
  ],

  context: async ({ cdpBrowser }, use) => {
    const context = cdpBrowser.contexts()[0];
    if (!context) {
      throw new Error('Chrome conectado, mas sem contexto de navegação.');
    }
    await use(context);
  },

  page: async ({ context }, use) => {
    const page = await context.newPage();
    await gotoApp(page, '/');
    await use(page);
    await page.close();
  },
});
