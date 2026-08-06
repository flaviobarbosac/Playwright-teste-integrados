import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { DEFAULT_API_BASE_URL, DEFAULT_CDP_URL, DEV_API_BASE_URL, E2E_DEVICE_ID } from './constants';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
export const SESSION_FILE = path.join(rootDir, '.auth', 'session.json');
export const STORAGE_STATE_FILE = path.join(rootDir, '.auth', 'user.json');

export interface ClampfySession {
  usuarioId: string;
  nome: string;
  dispositivoId: string;
  accessToken: string;
  refreshToken: string;
  expiraEm: string;
  refreshExpiraEm: string;
}

interface AuthApiResponse {
  usuarioId: string;
  nome: string;
  dispositivoId: string;
  accessToken: string;
  refreshToken: string;
  expiraEm: string;
  refreshExpiraEm: string;
  asaasReady?: boolean;
  prepareAviso?: string | null;
}

interface PlaywrightStorageState {
  origins?: Array<{
    origin: string;
    localStorage?: Array<{ name: string; value: string }>;
    sessionStorage?: Array<{ name: string; value: string }>;
  }>;
}

export function getApiBaseUrl(): string {
  if (process.env.E2E_API_BASE_URL) return process.env.E2E_API_BASE_URL;
  if (process.env.E2E_AUTH_MODE === 'local') return DEFAULT_API_BASE_URL;
  return DEV_API_BASE_URL;
}

export function isStorageAuthMode(): boolean {
  return process.env.E2E_AUTH_MODE === 'storage';
}

export function isCdpAuthMode(): boolean {
  return process.env.E2E_AUTH_MODE === 'cdp';
}

export function isChromeAuthMode(): boolean {
  return process.env.E2E_AUTH_MODE === 'chrome';
}

export function usesLiveBrowserSession(): boolean {
  return isCdpAuthMode() || isChromeAuthMode();
}

export function getCdpUrl(): string {
  if (process.env.E2E_CDP_URL) return process.env.E2E_CDP_URL;

  const portFile = path.join(
    process.env.LOCALAPPDATA ?? '',
    'Google',
    'Chrome',
    'User Data',
    'DevToolsActivePort',
  );

  if (portFile && fs.existsSync(portFile)) {
    const port = fs.readFileSync(portFile, 'utf8').split(/\r?\n/)[0]?.trim();
    if (port && /^\d+$/.test(port)) {
      return `http://127.0.0.1:${port}`;
    }
  }

  return DEFAULT_CDP_URL;
}

export async function readSessionFromPage(page: Page): Promise<ClampfySession> {
  const raw = await page.evaluate(() => {
    const key = 'clampfy.session';
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  });

  if (!raw) {
    throw new Error(
      'clampfy.session não encontrada no Chrome.\n' +
        'Abra https://www.dev.clampfy.com na guia do Chrome e faça login antes de rodar os testes.',
    );
  }

  return JSON.parse(raw) as ClampfySession;
}

export async function fetchDevSession(): Promise<ClampfySession> {
  const apiBase = getApiBaseUrl();
  const response = await fetch(`${apiBase}/auth/e2e`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceId: E2E_DEVICE_ID,
      deviceNome: 'Playwright E2E',
      plataforma: 'web',
      appVersion: 'e2e',
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `POST ${apiBase}/auth/e2e falhou (${response.status}): ${body}\n` +
        'Confirme que a API está em Development e que existe ao menos um usuário no banco.',
    );
  }

  const auth = (await response.json()) as AuthApiResponse;
  if (auth.prepareAviso) {
    console.warn(`[e2e-integrado] Aviso prepare: ${auth.prepareAviso}`);
  }
  if (auth.asaasReady === false) {
    throw new Error(
      `${auth.prepareAviso ?? 'Asaas sandbox não configurado.'}\n` +
        'Defina ASAAS_E2E_API_KEY com a API key sandbox do tenant antes de rodar o ciclo de ouro.',
    );
  }

  return mapAuthResponse(auth);
}

function mapAuthResponse(auth: AuthApiResponse): ClampfySession {
  return {
    usuarioId: auth.usuarioId,
    nome: auth.nome,
    dispositivoId: auth.dispositivoId,
    accessToken: auth.accessToken,
    refreshToken: auth.refreshToken,
    expiraEm: auth.expiraEm,
    refreshExpiraEm: auth.refreshExpiraEm,
  };
}

export function loadSessionFromStorageState(): ClampfySession {
  if (!fs.existsSync(STORAGE_STATE_FILE)) {
    throw new Error(
      `Sessão não encontrada em ${STORAGE_STATE_FILE}.\n` +
        'Rode: npm run auth:save — faça login em https://www.dev.clampfy.com',
    );
  }

  const state = JSON.parse(fs.readFileSync(STORAGE_STATE_FILE, 'utf8')) as PlaywrightStorageState;
  const origin = state.origins?.find((o) => /clampfy\.com/i.test(o.origin));
  const sessionEntry =
    origin?.localStorage?.find((e) => e.name === 'clampfy.session') ??
    origin?.sessionStorage?.find((e) => e.name === 'clampfy.session');

  if (!sessionEntry?.value) {
    throw new Error(
      'clampfy.session ausente no storageState. Rode npm run auth:save e conclua o login no Chrome.',
    );
  }

  return JSON.parse(sessionEntry.value) as ClampfySession;
}

export function saveSession(session: ClampfySession): void {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf8');
}

export function loadSession(): ClampfySession {
  if (usesLiveBrowserSession()) {
    throw new Error('Use readSessionFromPage(page) após login no ClampFY.');
  }

  if (isStorageAuthMode()) {
    return loadSessionFromStorageState();
  }

  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`Sessão E2E não encontrada em ${SESSION_FILE}. Rode npm run test:integrado.`);
  }
  return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as ClampfySession;
}
