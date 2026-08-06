import { test as setup, expect } from '@playwright/test';
import { fetchDevSession, saveSession } from './session';

setup('preparar sessão E2E', async () => {
  const session = await fetchDevSession();
  saveSession(session);
  expect(session.accessToken).toBeTruthy();
  console.log(`[e2e-integrado] Sessão: ${session.nome} (${session.usuarioId})`);
});
