import { test as base, expect } from '@playwright/test';
import { installRealAuthState } from './auth';
import { installGoogleWorkspaceStub } from './google-stub';
import { loadSession } from '../session';

export const test = base.extend({
  page: async ({ page, context }, use) => {
    const session = loadSession();
    await installGoogleWorkspaceStub(context);
    await installRealAuthState(context, session);
    await use(page);
  },
});

export { expect };
