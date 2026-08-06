import { test as base, expect } from '@playwright/test';
import { installRealAuthState } from './auth';
import { installGoogleWorkspaceStub } from './google-stub';
import { test as cdpTest } from './cdp';
import { test as chromeTest } from './chrome';
import {
  isCdpAuthMode,
  isChromeAuthMode,
  isStorageAuthMode,
  loadSession,
} from '../session';

export const test = isChromeAuthMode()
  ? chromeTest
  : isCdpAuthMode()
    ? cdpTest
    : isStorageAuthMode()
      ? base
      : base.extend({
          page: async ({ page, context }, use) => {
            const session = loadSession();
            await installGoogleWorkspaceStub(context);
            await installRealAuthState(context, session);
            await use(page);
          },
        });

export { expect };
