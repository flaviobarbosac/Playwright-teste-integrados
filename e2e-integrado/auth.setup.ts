import fs from 'node:fs';
import { test as setup, expect } from './fixtures';
import {
  fetchDevSession,
  getCdpUrl,
  isCdpAuthMode,
  isStorageAuthMode,
  loadSessionFromStorageState,
  prepareDevSessionForE2e,
  readSessionFromPage,
  saveSession,
  STORAGE_STATE_FILE,
  usesLiveBrowserSession,
} from './session';

setup('preparar autenticação E2E', async ({ page }) => {
  if (usesLiveBrowserSession()) {
    const session = await readSessionFromPage(page);
    expect(session.accessToken).toBeTruthy();
    await prepareDevSessionForE2e(session);
    const label = isCdpAuthMode() ? getCdpUrl() : 'chrome';
    console.log(`[e2e-dev/${label}] Sessão de ${session.nome}`);
    return;
  }

  if (isStorageAuthMode()) {
    if (!fs.existsSync(STORAGE_STATE_FILE)) {
      throw new Error(
        `Sessão ausente em ${STORAGE_STATE_FILE}.\nRode: npm run auth:save`,
      );
    }
    const session = loadSessionFromStorageState();
    expect(session.accessToken).toBeTruthy();
    console.log(`[e2e-dev] Sessão OK para ${session.nome}`);
    return;
  }

  const session = await fetchDevSession();
  saveSession(session);
  expect(session.accessToken).toBeTruthy();
  console.log(`[e2e-local] Sessão emitida para ${session.nome}`);
});
