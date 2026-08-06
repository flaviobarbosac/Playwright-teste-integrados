import type { BrowserContext } from '@playwright/test';

const GOOGLE_READY = {
  conectado: true,
  drivePronto: true,
  calendarPronto: true,
  pendencias: [],
};

const GOOGLE_CONEXAO = {
  contaAutenticada: true,
  workspaceConectado: true,
  conectado: true,
  googleEmail: 'e2e@clampfy.test',
};

export async function installGoogleWorkspaceStub(context: BrowserContext): Promise<void> {
  await context.route(/\/api\/v1\/google\/(prontidao|conexao)(\?.*)?$/i, async (route) => {
    const path = new URL(route.request().url()).pathname.toLowerCase();
    const body = path.endsWith('/prontidao') ? GOOGLE_READY : GOOGLE_CONEXAO;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
}
