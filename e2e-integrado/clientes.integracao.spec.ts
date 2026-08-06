import { test, expect } from './fixtures';
import { fetchPessoa4Devs } from './utils/4devs';
import { cadastrarClientePf } from './utils/cliente-form';

test.describe('Clientes (API real)', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 });

  test('cadastra cliente e persiste após reload', async ({ page }) => {
    const pessoa = await fetchPessoa4Devs();
    const nomeExibicao = `E2E ${pessoa.nome}`;

    await page.goto('/clientes/novo');
    await page.getByLabel('CPF/CNPJ').fill(pessoa.cpf);
    await page.getByLabel('Nome / Razão social').fill(nomeExibicao);
    await page.getByLabel('E-mail').fill(pessoa.email);
    await page.locator('button[form="cliente-form"]').click();

    await expect(page.getByText('Cliente cadastrado.')).toBeVisible();
    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+$/);

    await page.goto('/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByText(nomeExibicao)).toBeVisible();
  });
});
