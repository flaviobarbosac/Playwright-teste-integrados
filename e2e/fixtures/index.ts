import { test as base, expect } from '@playwright/test';
import { installAuthState } from './auth';
import { setupClientesApiMocks, type ClientesMockState } from './api-mocks';

type ClientesFixtures = {
  clientesMockState: ClientesMockState;
};

export const test = base.extend<ClientesFixtures>({
  clientesMockState: async ({}, use) => {
    await use({ clientes: [] });
  },

  page: async ({ page, context, clientesMockState }, use) => {
    await context.unrouteAll({ behavior: 'ignoreErrors' });
    await installAuthState(context);
    await setupClientesApiMocks(context, clientesMockState);
    await use(page);
  },
});

export { expect };
