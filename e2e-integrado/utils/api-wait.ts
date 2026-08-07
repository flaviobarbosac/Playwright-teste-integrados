import type { Page, Response } from '@playwright/test';

export async function waitForApiResponse(
  page: Page,
  options: {
    method: string;
    pathFragment: string;
    timeout?: number;
    ok?: boolean;
  },
): Promise<Response> {
  const { method, pathFragment, timeout = 90_000, ok = true } = options;
  const response = await page.waitForResponse(
    (res) =>
      res.request().method() === method &&
      res.url().includes(pathFragment) &&
      (ok ? res.status() < 500 : true),
    { timeout },
  );
  return response;
}
