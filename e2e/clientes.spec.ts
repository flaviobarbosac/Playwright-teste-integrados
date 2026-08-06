import { test, expect } from './fixtures';
import { VALID_CPF, VALID_CPF_FORMATTED } from './fixtures/test-data';

test.describe('Clientes', () => {
  test.describe.configure({ timeout: 15_000 });

  test('lista vazia exibe estado inicial', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByText('Seu relacionamento comercial começa aqui.')).toBeVisible();
    await expect(page.getByText('Nenhum cliente ainda')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Novo cliente' })).toBeVisible();
  });

  test('formulário de novo cliente exibe campos obrigatórios', async ({ page }) => {
    await page.goto('/clientes/novo');
    await expect(page.getByRole('heading', { name: 'Novo cliente' })).toBeVisible();
    await expect(page.getByLabel('CPF/CNPJ')).toBeVisible();
    await expect(page.getByLabel('Nome / Razão social')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible();
  });

  test('validação rejeita CPF inválido', async ({ page }) => {
    await page.goto('/clientes/novo');
    await page.getByLabel('CPF/CNPJ').fill('111.111.111-11');
    await page.getByLabel('Nome / Razão social').fill('Cliente Inválido');
    await page.locator('button[form="cliente-form"]').click();
    await expect(page.getByText('CPF ou CNPJ inválido')).toBeVisible();
  });

  test('cadastra cliente PF e abre o hub', async ({ page, clientesMockState }) => {
    await page.goto('/clientes/novo');
    await page.getByLabel('CPF/CNPJ').fill(VALID_CPF_FORMATTED);
    await page.getByLabel('Nome / Razão social').fill('Cliente Teste E2E');
    await page.getByLabel('E-mail').fill('cliente@e2e.test');
    await page.locator('button[form="cliente-form"]').click();

    await expect(page.getByText('Cliente cadastrado.')).toBeVisible();
    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]+$/);
    await expect(page.getByRole('heading', { name: 'Cliente Teste E2E' })).toBeVisible();
    expect(clientesMockState.clientes).toHaveLength(1);
    expect(clientesMockState.clientes[0]?.cpfCnpj).toBe(VALID_CPF);
  });
});
