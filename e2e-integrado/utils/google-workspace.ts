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
  timeoutMs = 30_000,
): Promise<void> {
  await page.waitForResponse(
    (response) => response.url().includes('/google/prontidao') && response.ok(),
    { timeout: timeoutMs },
  );
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
