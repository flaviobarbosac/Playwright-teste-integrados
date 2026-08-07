import { test, expect } from './fixtures';
import { cadastrarClientePf4Devs } from './utils/cliente-form';
import { gotoApp } from './utils/app-url';
import { waitForApiResponse } from './utils/api-wait';
import type { Pessoa4Devs } from './utils/4devs';

test.describe('Clientes (API real)', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

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
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible({ timeout: 30_000 });

    const listaSwitch = page.getByRole('checkbox', { name: 'Lista' });
    if (await listaSwitch.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await listaSwitch.check();
    }

    const clienteNaLista = page.getByText(nomeEditado, { exact: true });
    await expect(clienteNaLista).toBeVisible({ timeout: 90_000 });
    await clienteNaLista.click();
    await expect(page).toHaveURL(new RegExp(`/clientes/${clienteId}$`), { timeout: 30_000 });
    await expect(page.getByText('Carregando cliente...')).toBeHidden({ timeout: 90_000 });
    await expect(page.getByRole('heading', { name: nomeEditado })).toBeVisible({ timeout: 30_000 });
  });

  test('edita cliente pela rota /editar', async ({ page }) => {
    for (let attempt = 0; attempt < 6; attempt++) {
      const getCliente = page.waitForResponse(
        (res) =>
          res.request().method() === 'GET' &&
          res.url().includes(`/Cliente/${clienteId}`) &&
          res.status() < 500,
        { timeout: 45_000 },
      );
      await gotoApp(page, `/clientes/${clienteId}/editar`);
      await getCliente.catch(() => null);
      if (await page.getByLabel('CPF/CNPJ').isVisible({ timeout: 8_000 }).catch(() => false)) break;
      await page.waitForTimeout(4_000 * (attempt + 1));
    }
    await expect(page.getByText('Carregando cliente...')).toBeHidden({ timeout: 30_000 });
    await expect(page.getByLabel('CPF/CNPJ')).toBeVisible({ timeout: 15_000 });

    const apelido = `Apelido ${Date.now()}`;
    await page.getByLabel(/Apelido|Nome Fantasia/).fill(apelido);

    let saved = false;
    for (let attempt = 0; attempt < 6; attempt++) {
      const saveResponse = waitForApiResponse(page, {
        method: 'PUT',
        pathFragment: `/Cliente/${clienteId}`,
        timeout: 90_000,
        ok: false,
      });
      await page.getByRole('button', { name: 'Salvar' }).click();
      const response = await saveResponse;
      if (response.status() === 429) {
        await page.waitForTimeout(3_000 * (attempt + 1));
        continue;
      }
      expect(response.ok(), `PUT cliente → ${response.status()}`).toBeTruthy();
      saved = true;
      break;
    }
    expect(saved, 'PUT cliente não concluiu após retries').toBeTruthy();

    await expect(page).toHaveURL(/\/clientes$/, { timeout: 30_000 });
    await expect(page.getByText(nomeEditado)).toBeVisible({ timeout: 30_000 });
  });

  test('desativa e reativa cliente', async ({ page }) => {
    await gotoApp(page, `/clientes/${clienteId}`);
    await expect(page.getByText('Carregando cliente...')).toBeHidden({ timeout: 90_000 });
    await page.getByRole('button', { name: 'Desativar cliente' }).click();
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();

    const deleteResponse = waitForApiResponse(page, {
      method: 'DELETE',
      pathFragment: `/Cliente/${clienteId}`,
      timeout: 90_000,
      ok: false,
    });
    await confirmDialog.getByRole('button', { name: /Desativar|Excluir/i }).click();
    const response = await deleteResponse;
    expect(response.ok(), `DELETE cliente → ${response.status()}`).toBeTruthy();

    await gotoApp(page, '/clientes');
    await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible({ timeout: 30_000 });

    const excluidosToggle = page.getByRole('checkbox', { name: 'Excluídos' });
    await expect(excluidosToggle).toBeVisible({ timeout: 30_000 });
    await excluidosToggle.check();

    const listaToggle = page.getByRole('checkbox', { name: 'Lista' });
    if (await listaToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      if (!(await listaToggle.isChecked())) {
        await listaToggle.check();
      }
    }

    await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toBeVisible({
      timeout: 60_000,
    });

    await page
      .getByRole('row')
      .filter({ hasText: nomeEditado })
      .getByRole('button', { name: /Restaurar|Reativar/i })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Reativar' }).click();

    await expect(page.getByText('Cliente restaurado.')).toBeVisible({ timeout: 30_000 });

    await excluidosToggle.uncheck();
    await expect(page.getByRole('row').filter({ hasText: nomeEditado })).toBeVisible({
      timeout: 60_000,
    });
  });
});
