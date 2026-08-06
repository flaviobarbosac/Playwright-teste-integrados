import { test, expect } from './fixtures';
import { gerarCpfValido } from './utils/cpf';

test.describe('Clientes (API real)', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  test('cadastra cliente e persiste após reload', async ({ page }) => {
    const nome = `E2E Cliente ${Date.now()}`;

    await page.goto('/clientes/novo');
    await page.getByLabel('CPF/CNPJ').fill(gerarCpfValido());
    await page.getByLabel('Nome / Razão social').fill(nome);
    await page.getByLabel('E-mail').fill(`e2e-${Date.now()}@clampfy.test`);
    await page.locator('button[form="cliente-form"]').click();

    await expect(page.getByText('Cliente cadastrado.')).toBeVisible();
    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+$/);

    await page.goto('/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByText(nome)).toBeVisible();
  });
});
