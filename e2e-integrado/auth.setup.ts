import { test as setup, expect } from '@playwright/test';
import { fetchDevSession, isStorageAuthMode, saveSession, STORAGE_STATE_FILE } from './session';
import fs from 'node:fs';

setup('preparar autenticação E2E', async () => {
  if (isStorageAuthMode()) {
    if (!fs.existsSync(STORAGE_STATE_FILE)) {
      throw new Error(
        `Sessão ausente em ${STORAGE_STATE_FILE}. Rode: npm run auth:save`,
      );
    }
    console.log(`[e2e-dev] Usando storageState: ${STORAGE_STATE_FILE}`);
    return;
  }

  const session = await fetchDevSession();
  saveSession(session);
  expect(session.accessToken).toBeTruthy();
  console.log(`[e2e-local] Sessão emitida para ${session.nome} (${session.usuarioId})`);
});
