import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const storageFile = path.join(rootDir, 'e2e-integrado', '.auth', 'user.json');
const baseUrl = process.env.E2E_BASE_URL ?? 'https://www.dev.clampfy.com';
const cdpUrl = process.env.E2E_CDP_URL ?? 'http://127.0.0.1:9222';

async function waitForSession(page) {
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    const raw = await page.evaluate(() => {
      const key = 'clampfy.session';
      return localStorage.getItem(key) ?? sessionStorage.getItem(key);
    });
    if (raw) return raw;
    await page.waitForTimeout(1000);
  }
  throw new Error(
    'Timeout: abra o Chrome E2E, faça login em https://www.dev.clampfy.com e rode auth:save de novo.',
  );
}

let browser;
try {
  browser = await chromium.connectOverCDP(cdpUrl);
} catch {
  console.error(`[auth:save] Não conectou em ${cdpUrl}`);
  console.error('[auth:save] 1) Feche todos os Chromes');
  console.error('[auth:save] 2) Abra pelo atalho "Chrome E2E" na barra de tarefas');
  console.error('[auth:save] 3) Faça login em https://www.dev.clampfy.com');
  console.error('[auth:save] 4) Rode: npm run auth:save');
  process.exit(1);
}

const context = browser.contexts()[0];
if (!context) {
  console.error('[auth:save] Chrome conectado, mas sem contexto.');
  process.exit(1);
}

const page =
  context.pages().find((p) => /clampfy\.com/i.test(p.url())) ?? (await context.newPage());

if (!/clampfy\.com/i.test(page.url())) {
  console.log(`[auth:save] Abra ou navegue para ${baseUrl} no Chrome E2E`);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
}

console.log('[auth:save] Aguardando sessão do ClampFY no Chrome E2E...');
const sessionRaw = await waitForSession(page);

await page.evaluate((raw) => {
  localStorage.setItem('clampfy.session', raw);
  localStorage.setItem('clampfy.rememberMe', 'true');
  localStorage.setItem('clampfy.onboarding.completed', '1');
  localStorage.setItem('clampfy-cookie-consent', 'accepted');
  sessionStorage.setItem('clampfy_login_splash_seen', '1');
}, sessionRaw);

fs.mkdirSync(path.dirname(storageFile), { recursive: true });
await context.storageState({ path: storageFile });

console.log(`[auth:save] Sessão salva em ${storageFile}`);
console.log('[auth:save] Rode: npm run test:dev:headed');
