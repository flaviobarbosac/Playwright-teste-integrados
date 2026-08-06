import { test, expect } from './fixtures';
import { cadastrarClientePf4Devs } from './utils/cliente-form';
import { gotoApp } from './utils/app-url';
import type { Pessoa4Devs } from './utils/4devs';

test.describe('Clientes (API real)', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  let pessoa: Pessoa4Devs;
  let nomeCadastro: string;
  let nomeEditado: string;
  let clienteId: string;

  test('cadastra PF completo com dados do 4Devs', async ({ page }) => {
    const cadastro = await cadastrarClientePf4Devs(page, {
      nome: (p) => `E2E ${p.nome}`,
    });
    pessoa = cadastro.pessoa;
    clienteId = cadastro.clienteId;
    nomeCadastro = pessoa.nome;
    nomeEditado = `${nomeCadastro} Editado`;

    await expect(page.getByText('Cliente cadastrado.')).toBeVisible();
    await expect(page.getByRole('heading', { name: nomeCadastro })).toBeVisible();
    if (pessoa.email) {
      await expect(page.getByRole('link', { name: pessoa.email })).toBeVisible();
    }
  });

  test('hub exibe timeline vazia e ações do módulo', async ({ page }) => {
    await gotoApp(page, `/clientes/${clienteId}`);
    await expect(page.getByRole('heading', { name: nomeCadastro })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Histórico vazio')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nova proposta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nova cobrança' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar cliente' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Desativar cliente' })).toBeVisible();
  });

  test('edita cliente pelo hub', async ({ page }) => {
    await gotoApp(page, `/clientes/${clienteId}`);
    await page.getByRole('button', { name: 'Editar cliente' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nome / Razão social').fill(nomeEditado);
    await dialog.getByLabel('Complemento').fill('Sala E2E atualizada');
    await dialog.locator('button[form="hub-cliente-form"]').click();

    await expect(page.getByText('Cliente atualizado.')).toBeVisible();
    await expect(page.getByRole('heading', { name: nomeEditado })).toBeVisible();
  });

  test('lista exibe cliente e permite abrir o hub', async ({ page }) => {
    await gotoApp(page, '/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();
    await expect(page.getByText(nomeEditado)).toBeVisible();

    const listaSwitch = page.getByRole('switch', { name: 'Lista' });
    if (await listaSwitch.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await listaSwitch.click();
      await expect(page.getByText(nomeEditado)).toBeVisible();
      await listaSwitch.click();
    }

    await page.getByRole('row').filter({ hasText: nomeEditado }).click();
    await expect(page).toHaveURL(new RegExp(`/clientes/${clienteId}$`));
    await expect(page.getByRole('heading', { name: nomeEditado })).toBeVisible();
  });

  test('edita cliente pela rota /editar', async ({ page }) => {
    await gotoApp(page, `/clientes/${clienteId}/editar`);
    await expect(page.getByRole('heading', { name: 'Editar cliente' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByLabel('CPF/CNPJ')).toBeVisible({ timeout: 15_000 });

    const apelido = `Apelido ${Date.now()}`;
    await page.getByLabel(/Apelido|Nome Fantasia/).fill(apelido);
    await page.locator('button[form="cliente-form"]').click();

    await expect(page.getByText('Cliente atualizado.')).toBeVisible();
    await expect(page).toHaveURL(/\/clientes$/);
    await expect(page.getByText(nomeEditado)).toBeVisible();
  });

  test('desativa e reativa cliente', async ({ page }) => {
    await gotoApp(page, `/clientes/${clienteId}`);
    await page.getByRole('button', { name: 'Desativar cliente' }).click();
    await page.getByRole('button', { name: 'Desativar' }).click();

    await expect(page.getByText('Cliente excluído.')).toBeVisible();
    await expect(page).toHaveURL(/\/clientes$/);

    await page.getByRole('switch', { name: 'Excluídos' }).click();
    await expect(page.getByText(nomeEditado)).toBeVisible();

    await page
      .getByRole('row')
      .filter({ hasText: nomeEditado })
      .getByRole('button', { name: 'Reativar' })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reativar' }).click();

    await expect(page.getByText('Cliente restaurado.')).toBeVisible();

    await page.getByRole('switch', { name: 'Excluídos' }).click();
    await expect(page.getByText(nomeEditado)).toBeVisible();
  });
});
