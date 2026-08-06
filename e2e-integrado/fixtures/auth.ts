import type { BrowserContext } from '@playwright/test';
import type { ClampfySession } from '../session';
import { E2E_DEVICE_ID } from '../constants';

export async function installRealAuthState(
  context: BrowserContext,
  session: ClampfySession,
): Promise<void> {
  await context.addInitScript(
    ({ sessionData, deviceId }) => {
      const raw = JSON.stringify(sessionData);
      sessionStorage.setItem('clampfy.session', raw);
      localStorage.setItem('clampfy.session', raw);
      localStorage.setItem('clampfy.deviceId', deviceId);
      localStorage.setItem('clampfy.rememberMe', 'false');
      localStorage.setItem('clampfy.onboarding.completed', '1');
      localStorage.setItem('clampfy-cookie-consent', 'accepted');
      sessionStorage.setItem('clampfy_login_splash_seen', '1');

      if ('serviceWorker' in navigator) {
        void navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => void reg.unregister());
        });
      }
    },
    { sessionData: session, deviceId: E2E_DEVICE_ID },
  );
}
