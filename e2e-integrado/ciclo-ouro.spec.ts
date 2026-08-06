import { test, expect } from './fixtures';
import { createApiClient } from './api-client';
import { loadSession, readSessionFromPage, usesLiveBrowserSession } from './session';
import { cadastrarClientePf4Devs } from './utils/cliente-form';
import { gotoApp } from './utils/app-url';
import { preencherMoedaBr } from './utils/moeda-form';
import { aguardarCarregamentoGoogleProntidao, fecharDialogoGoogleSeAberto } from './utils/google-workspace';

test.describe('Ciclo de ouro (API real)', () => {
  test.describe.configure({ mode: 'serial', timeout: 180_000 });

  test('Proposta → Contrato → Cobrança → Recebido', async ({ page }) => {
    const stamp = Date.now();
    const propostaTitulo = `E2E Proposta ${stamp}`;

    const { clienteId } = await cadastrarClientePf4Devs(page, {
      nome: (p) => `E2E ${p.nome}`,
    });
    await expect(page.getByText('Cliente cadastrado.')).toBeVisible();

    expect(clienteId).toBeTruthy();

    const session = usesLiveBrowserSession() ? await readSessionFromPage(page) : loadSession();
    const api = createApiClient(session);

    await gotoApp(page, `/propostas/nova?clienteId=${clienteId}`);
    await expect(page.getByRole('heading', { name: /proposta/i })).toBeVisible();
    await aguardarCarregamentoGoogleProntidao(page);
    await page.getByLabel('Título').fill(propostaTitulo);
    await page.getByLabel('Descrição').fill('Serviço E2E ciclo de ouro');
    await preencherMoedaBr(page, 'Vlr unit.', 150);
    await page.getByRole('button', { name: 'Salvar' }).click();

    const googleBlocked = page.getByText(/Google Drive e o Google Calendar/i);
    const savedToast = page.getByText('Proposta salva na lista.');

    const outcome = await Promise.race([
      savedToast.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'saved' as const),
      googleBlocked.waitFor({ state: 'visible', timeout: 30_000 }).then(() => 'blocked' as const),
    ]).catch(() => 'timeout' as const);

    let propostaId: string;

    if (outcome === 'saved') {
      await expect(page).toHaveURL(/\/propostas$/);
      const propostas = await api.listarPropostas();
      const proposta = propostas.find((p) => p.titulo === propostaTitulo);
      expect(proposta?.id).toBeTruthy();
      propostaId = proposta!.id;
    } else if (outcome === 'blocked') {
      const criada = await api.criarProposta({
        clienteId,
        titulo: propostaTitulo,
        itens: [{ descricao: 'Serviço E2E ciclo de ouro', quantidade: 1, valorUnitario: 150 }],
      });
      propostaId = criada.id;
    } else {
      try {
        const criada = await api.criarProposta({
          clienteId,
          titulo: propostaTitulo,
          itens: [{ descricao: 'Serviço E2E ciclo de ouro', quantidade: 1, valorUnitario: 150 }],
        });
        propostaId = criada.id;
      } catch (error) {
        throw new Error(
          `Salvar proposta não concluiu na UI nem via API. ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const envio = await api.enviarProposta(propostaId);
    expect(envio.token).toBeTruthy();

    const aceite = await api.aceitarPropostaPortal(envio.token);
    expect(aceite.status).toBe(3);

    await gotoApp(page, `/propostas/${propostaId}/editar`);
    await expect(page.getByRole('button', { name: 'Gerar contrato' })).toBeVisible();
    await page.getByRole('button', { name: 'Gerar contrato' }).click();
    await expect(page.getByText('Contrato gerado.')).toBeVisible();
    await expect(page).toHaveURL(/\/contratos\/[0-9a-f-]+/);

    await gotoApp(page, `/propostas/${propostaId}/editar`);
    await fecharDialogoGoogleSeAberto(page);

    let cobrancaId: string | undefined;
    const cobrancasExistentes = await api.listarCobrancasDaProposta(propostaId);
    cobrancaId = cobrancasExistentes[0]?.id;

    if (!cobrancaId) {
      const criarCobrancaBtn = page.getByRole('button', { name: 'Criar cobrança' });
      if (await criarCobrancaBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await criarCobrancaBtn.click();
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: 'Criar cobrança' }).click();
        await expect(page.getByText('Cobrança criada.')).toBeVisible({ timeout: 30_000 });
      } else {
        await api.criarCobrancaProposta(propostaId, 150);
      }
    }

    for (let attempt = 0; attempt < 30; attempt++) {
      const cobrancas = await api.listarCobrancasDaProposta(propostaId);
      if (cobrancas.length > 0) {
        cobrancaId = cobrancas[0]?.id;
        break;
      }
      await page.waitForTimeout(1_000);
    }
    expect(cobrancaId).toBeTruthy();

    await gotoApp(page, `/cobrancas/${cobrancaId}/editar`);
    await expect(page.getByRole('heading', { name: /cobran/i })).toBeVisible();

    const sandboxBtn = page.getByRole('button', { name: 'Atualizar pagamento (sandbox)' });
    await expect(sandboxBtn).toBeVisible({ timeout: 60_000 });
    await sandboxBtn.click();
    await expect(page.getByText('Pagamento sandbox confirmado e sincronizado.')).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('Recebida')).toBeVisible({ timeout: 60_000 });

    await gotoApp(page, '/dashboard');
    await expect(page.getByText('Recebido')).toBeVisible();
  });
});
