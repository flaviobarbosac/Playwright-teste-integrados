import type { Page } from '@playwright/test';
import { DEV_BASE_URL } from '../constants';

export function resolveAppUrl(path: string): string {
  const base = process.env.E2E_BASE_URL ?? DEV_BASE_URL;
  return new URL(path, base).toString();
}

export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(resolveAppUrl(path));
}
