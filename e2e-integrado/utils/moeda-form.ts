import type { Locator, Page } from '@playwright/test';

async function preencherDigitosCentavos(field: Locator, value: number): Promise<void> {
  const digits = String(Math.round(value * 100));
  await field.click();
  await field.press('Control+a');
  await field.pressSequentially(digits, { delay: 30 });
}

/** Fills a Brazilian decimal field (e.g. Qtd) that uses cent-based digit entry. */
export async function preencherDecimalBr(page: Page, label: string, value: number): Promise<void> {
  await preencherDigitosCentavos(page.getByLabel(label), value);
}

/** Fills a Brazilian currency field (e.g. Vlr unit.) that uses cent-based digit entry. */
export async function preencherMoedaBr(page: Page, label: string, value: number): Promise<void> {
  await preencherDigitosCentavos(page.getByLabel(label), value);
}
