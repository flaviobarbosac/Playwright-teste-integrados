import { expect, type Page } from '@playwright/test';
import type { ClampfyApiClient } from '../api-client';

export async function fecharDialogoGoogleSeAberto(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: 'Integração Google necessária' });
  if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await dialog.getByRole('button', { name: 'Fechar' }).click();
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  }
}

export async function aguardarCarregamentoGoogleProntidao(
  page: Page,
  timeoutMs = 60_000,
): Promise<void> {
  const salvarPronto = page.getByRole('button', { name: 'Salvar' });
  if (await salvarPronto.isEnabled({ timeout: 3_000 }).catch(() => false)) {
    return;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;

    const response = await page
      .waitForResponse(
        (res) => res.url().includes('/google/prontidao') && res.status() < 500,
        { timeout: Math.min(20_000, remaining) },
      )
      .catch(() => null);

    if (response?.ok()) return;
    if (response?.status() === 429) {
      await page.waitForTimeout(3_000);
      continue;
    }

    if (await salvarPronto.isEnabled({ timeout: 2_000 }).catch(() => false)) {
      return;
    }

    await page.waitForTimeout(2_000);
  }

  await expect(salvarPronto).toBeEnabled({ timeout: 5_000 });
}

export async function aguardarGoogleWorkspace(
  page: Page,
  api: ClampfyApiClient,
  timeoutMs = 60_000,
): Promise<void> {
  await aguardarCarregamentoGoogleProntidao(page, timeoutMs);

  await expect
    .poll(
      async () => {
        const prontidao = await api.getGoogleProntidao();
        return api.isGooglePronto(prontidao);
      },
      {
        timeout: timeoutMs,
        message:
          'Google Workspace não está pronto. Conecte Drive e Calendar em Configurações → Integração Google.',
      },
    )
    .toBe(true);
}
