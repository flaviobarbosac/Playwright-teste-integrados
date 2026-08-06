import { test, expect } from './fixtures';
import { createApiClient } from './api-client';
import { loadSession } from './session';
import { gerarCpfValido } from './utils/cpf';

test.describe('Ciclo de ouro (API real)', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  test('Proposta → Contrato → Cobrança → Recebido', async ({ page }) => {
    const stamp = Date.now();
    const clienteNome = `E2E Cliente ${stamp}`;
    const propostaTitulo = `E2E Proposta ${stamp}`;
    const api = createApiClient(loadSession());

    await page.goto('/clientes/novo');
    await page.getByLabel('CPF/CNPJ').fill(gerarCpfValido());
    await page.getByLabel('Nome / Razão social').fill(clienteNome);
    await page.getByLabel('E-mail').fill(`e2e-${stamp}@clampfy.test`);
    await page.locator('button[form="cliente-form"]').click();
    await expect(page.getByText('Cliente cadastrado.')).toBeVisible();

    const clienteMatch = page.url().match(/\/clientes\/([0-9a-f-]+)$/i);
    expect(clienteMatch?.[1]).toBeTruthy();
    const clienteId = clienteMatch![1]!;

    await page.goto(`/propostas/nova?clienteId=${clienteId}`);
    await expect(page.getByRole('heading', { name: /proposta/i })).toBeVisible();
    await page.getByLabel('Título').fill(propostaTitulo);
    await page.getByLabel('Descrição').fill('Serviço E2E ciclo de ouro');
    await page.getByLabel('Qtd').fill('1');
    await page.getByLabel('Vlr unit.').fill('150');
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText('Proposta salva na lista.')).toBeVisible();

    const propostaMatch = page.url().match(/\/propostas\/([0-9a-f-]+)\/editar/i);
    expect(propostaMatch?.[1]).toBeTruthy();
    const propostaId = propostaMatch![1]!;

    const envio = await api.enviarProposta(propostaId);
    expect(envio.token).toBeTruthy();

    const aceite = await api.aceitarPropostaPortal(envio.token);
    expect(aceite.status).toBe(3);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Gerar contrato' })).toBeVisible();
    await page.getByRole('button', { name: 'Gerar contrato' }).click();
    await expect(page.getByText('Contrato gerado.')).toBeVisible();
    await expect(page).toHaveURL(/\/contratos\/[0-9a-f-]+$/);

    await page.goto(`/propostas/${propostaId}/editar`);
    await expect(page.getByRole('button', { name: 'Criar cobrança' })).toBeVisible();
    await page.getByRole('button', { name: 'Criar cobrança' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Criar cobrança' }).click();
    await expect(page.getByText('Cobrança criada.')).toBeVisible();

    let cobrancaId: string | undefined;
    for (let attempt = 0; attempt < 30; attempt++) {
      const cobrancas = await api.listarCobrancasDaProposta(propostaId);
      if (cobrancas.length > 0) {
        cobrancaId = cobrancas[0]?.id;
        break;
      }
      await page.waitForTimeout(1_000);
    }
    expect(cobrancaId).toBeTruthy();

    await page.goto(`/cobrancas/${cobrancaId}/editar`);
    await expect(page.getByRole('heading', { name: /cobran/i })).toBeVisible();

    const sandboxBtn = page.getByRole('button', { name: 'Atualizar pagamento (sandbox)' });
    await expect(sandboxBtn).toBeVisible({ timeout: 60_000 });
    await sandboxBtn.click();
    await expect(page.getByText('Pagamento sandbox confirmado e sincronizado.')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('Recebida')).toBeVisible({ timeout: 60_000 });

    await page.goto('/dashboard');
    await expect(page.getByText('Recebido')).toBeVisible();
  });
});
