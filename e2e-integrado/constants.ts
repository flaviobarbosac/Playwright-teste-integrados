export const E2E_DEVICE_ID = 'e2e-playwright';

export const DEFAULT_API_BASE_URL = 'http://localhost:5080/api/v1';
export const DEV_API_BASE_URL = 'https://api.dev.clampfy.com/api/v1';
export const DEV_BASE_URL = 'https://www.dev.clampfy.com';

export const DEFAULT_CDP_PORT = 9222;
export const DEFAULT_CDP_URL = `http://127.0.0.1:${DEFAULT_CDP_PORT}`;

export const DEFAULT_GOOGLE_EMAIL = 'flaviobarbosa.vix@gmail.com';

export function getGoogleEmail(): string {
  return process.env.E2E_GOOGLE_EMAIL ?? DEFAULT_GOOGLE_EMAIL;
}

export const FOUR_DEVS_URL = 'https://www.4devs.com.br/ferramentas_online.php';
