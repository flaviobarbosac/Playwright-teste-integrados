import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_API_BASE_URL, DEV_API_BASE_URL, E2E_DEVICE_ID } from './constants';

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
  }>;
}

export function getApiBaseUrl(): string {
  if (process.env.E2E_API_BASE_URL) return process.env.E2E_API_BASE_URL;
  return process.env.E2E_AUTH_MODE === 'storage' ? DEV_API_BASE_URL : DEFAULT_API_BASE_URL;
}

export function isStorageAuthMode(): boolean {
  return process.env.E2E_AUTH_MODE === 'storage';
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
  const sessionEntry = origin?.localStorage?.find((e) => e.name === 'clampfy.session');

  if (!sessionEntry?.value) {
    throw new Error(
      'clampfy.session ausente no storageState. Rode npm run auth:save após login completo.',
    );
  }

  return JSON.parse(sessionEntry.value) as ClampfySession;
}

export function saveSession(session: ClampfySession): void {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), 'utf8');
}

export function loadSession(): ClampfySession {
  if (isStorageAuthMode()) {
    return loadSessionFromStorageState();
  }

  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`Sessão E2E não encontrada em ${SESSION_FILE}. Rode npm run test:integrado.`);
  }
  return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')) as ClampfySession;
}
