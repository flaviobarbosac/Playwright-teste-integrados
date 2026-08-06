import type { BrowserContext } from '@playwright/test';
import { TEST_SESSION } from './test-data';

export async function installAuthState(context: BrowserContext): Promise<void> {
  await context.addInitScript((session) => {
    const raw = JSON.stringify(session);
    sessionStorage.setItem('clampfy.session', raw);
    localStorage.setItem('clampfy.session', raw);
    localStorage.setItem('clampfy.rememberMe', 'false');
    localStorage.setItem('clampfy.onboarding.completed', '1');
    localStorage.setItem('clampfy-cookie-consent', 'accepted');
    sessionStorage.setItem('clampfy_login_splash_seen', '1');

    if ('serviceWorker' in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => void reg.unregister());
      });
    }
  }, TEST_SESSION);
}
