import type { Page } from '@playwright/test';
import { getGoogleEmail } from '../constants';

async function hasClampfySession(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const key = 'clampfy.session';
    return !!(localStorage.getItem(key) ?? sessionStorage.getItem(key));
  });
}

async function acceptCookiesIfVisible(page: Page): Promise<void> {
  const accept = page.getByRole('button', { name: /aceitar|concordo/i });
  if (await accept.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await accept.click();
  }
}

async function selectGoogleAccount(page: Page, email: string): Promise<void> {
  const byData = page.locator(`div[data-identifier="${email}"], div[data-email="${email}"]`).first();
  if (await byData.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await byData.click();
    return;
  }

  const byText = page.getByText(email, { exact: true });
  if (await byText.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await byText.click();
    return;
  }

  const emailInput = page.locator('input[type="email"]');
  if (await emailInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await emailInput.fill(email);
    await page.getByRole('button', { name: /avançar|próximo|next/i }).click();
  }
}

async function clickGoogleSignIn(page: Page): Promise<Page | null> {
  const popupPromise = page.context().waitForEvent('page', { timeout: 15_000 }).catch(() => null);

  await page
    .waitForSelector('iframe[src*="accounts.google.com"]', { timeout: 15_000 })
    .catch(() => {});

  const iframe = page.frameLocator('iframe[src*="accounts.google.com"]');
  const gisButton = iframe.locator('[role="button"]').first();
  if (await gisButton.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await gisButton.click();
    return popupPromise;
  }

  const loginBtn = page
    .getByRole('button', { name: /continuar com o google|entrar com google/i })
    .first();
  await loginBtn.click({ timeout: 10_000 });
  return popupPromise;
}

async function completeGoogleLogin(page: Page, email: string): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await acceptCookiesIfVisible(page);

  const popupPromise = clickGoogleSignIn(page);
  const popup = await popupPromise;

  const googlePage = popup ?? page;
  await googlePage.waitForURL(/accounts\.google\.com|clampfy\.com/i, { timeout: 30_000 }).catch(() => {});

  if (/accounts\.google\.com/i.test(googlePage.url())) {
    await selectGoogleAccount(googlePage, email);
  }

  if (popup) {
    await popup.waitForEvent('close', { timeout: 180_000 }).catch(() => {});
  }

  await page.waitForFunction(
    () => {
      const key = 'clampfy.session';
      return !!(localStorage.getItem(key) ?? sessionStorage.getItem(key));
    },
    undefined,
    { timeout: 180_000 },
  );
}

export async function ensureClampfyLogin(page: Page, baseURL: string): Promise<void> {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await acceptCookiesIfVisible(page);

  if (await hasClampfySession(page)) return;

  const email = getGoogleEmail();
  console.log(`[e2e-dev] Sem sessão — selecionando conta Google: ${email}`);
  await completeGoogleLogin(page, email);
}
