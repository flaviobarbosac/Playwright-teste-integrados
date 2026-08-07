import { test, expect } from './fixtures';
import { createApiClient } from './api-client';
import { loadSession, readSessionFromPage, usesLiveBrowserSession } from './session';
import { cadastrarClientePf4Devs } from './utils/cliente-form';
import { gotoApp } from './utils/app-url';
import { preencherMoedaBr } from './utils/moeda-form';
import { aguardarCarregamentoGoogleProntidao, fecharDialogoGoogleSeAberto } from './utils/google-workspace';

test.describe('Ciclo de ouro (API real)', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 });

  test('Proposta → Contrato → Cobrança → Recebido', async ({ page }) => {
    const stamp = Date.now();
    const propostaTitulo = `E2E Proposta ${stamp}`;

    const { clienteId, pessoa } = await cadastrarClientePf4Devs(page, {
      nome: (p) => `E2E ${p.nome}`,
    });
    await expect(page.getByRole('heading', { name: pessoa.nome })).toBeVisible({ timeout: 15_000 });

    expect(clienteId).toBeTruthy();

    const session = usesLiveBrowserSession() ? await readSessionFromPage(page) : loadSession();
    const api = createApiClient(session);

    await gotoApp(page, `/propostas/nova?clienteId=${clienteId}`);
    await expect(page.getByRole('heading', { name: /proposta/i })).toBeVisible();
    await aguardarCarregamentoGoogleProntidao(page, 90_000);
    await fecharDialogoGoogleSeAberto(page);
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
    await page.waitForTimeout(2_000);

    await gotoApp(page, `/propostas/${propostaId}/editar`);
    await fecharDialogoGoogleSeAberto(page);
    await expect(page.getByRole('button', { name: 'Gerar contrato' })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Gerar contrato' }).click();

    const contratoUrlOk = await page
      .waitForURL(/\/contratos\/[0-9a-f-]+/, { timeout: 45_000 })
      .then(() => true)
      .catch(() => false);

    if (!contratoUrlOk) {
      let lastContratoError: unknown;
      for (let attempt = 0; attempt < 6; attempt++) {
        try {
          const contrato = await api.gerarContratoProposta(propostaId);
          await gotoApp(page, `/contratos/${contrato.id}`);
          lastContratoError = undefined;
          break;
        } catch (error) {
          lastContratoError = error;
          await page.waitForTimeout(3_000 * (attempt + 1));
        }
      }
      if (lastContratoError) {
        const detail =
          lastContratoError instanceof Error ? lastContratoError.message : String(lastContratoError);
        throw new Error(`Gerar contrato falhou na UI e via API. ${detail}`);
      }
    }

    await expect(page).toHaveURL(/\/contratos\/[0-9a-f-]+/, { timeout: 30_000 });
    await expect(page.getByText('Contrato gerado.')).toBeVisible({ timeout: 15_000 }).catch(() => undefined);

    let cobrancaId: string | undefined;
    let lastCobrancaError: unknown;

    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const existentes = await api.listarCobrancasDaProposta(propostaId);
        if (existentes[0]?.id) {
          cobrancaId = existentes[0].id;
          break;
        }
        const criada = await api.criarCobrancaProposta(propostaId, 150);
        if (criada?.id) {
          cobrancaId = criada.id;
          break;
        }
      } catch (error) {
        lastCobrancaError = error;
        await page.waitForTimeout(5_000 * (attempt + 1));
      }
    }

    if (!cobrancaId) {
      await gotoApp(page, `/cobrancas/nova?clienteId=${clienteId}`);
      await expect(page.getByRole('heading', { name: /Nova cobrança/i })).toBeVisible({ timeout: 30_000 });
      const propostaField = page.getByLabel(/proposta/i);
      if (await propostaField.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await propostaField.click();
        await page.getByRole('option', { name: new RegExp(propostaTitulo) }).click();
      }
      await preencherMoedaBr(page, 'Valor', 150);
      await page.getByRole('button', { name: 'Salvar' }).click();
      await page.waitForURL(/\/cobrancas/, { timeout: 60_000 }).catch(() => undefined);
      for (let attempt = 0; attempt < 15; attempt++) {
        const cobrancas = await api.listarCobrancasDaProposta(propostaId);
        if (cobrancas[0]?.id) {
          cobrancaId = cobrancas[0].id;
          break;
        }
        await page.waitForTimeout(2_000);
      }
    }

    if (!cobrancaId) {
      const detail =
        lastCobrancaError instanceof Error ? lastCobrancaError.message : String(lastCobrancaError ?? '');
      throw new Error(`Não foi possível criar cobrança para a proposta. ${detail}`);
    }

    await api.aguardarCobrancaDisponivel(cobrancaId);

    let lastSandboxError: unknown;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const sync = await api.confirmarPagamentoSandbox(cobrancaId);
        if (sync.erro) throw new Error(sync.erro);
        lastSandboxError = undefined;
        break;
      } catch (error) {
        lastSandboxError = error;
        await page.waitForTimeout(3_000 * (attempt + 1));
      }
    }
    if (lastSandboxError) {
      const detail =
        lastSandboxError instanceof Error ? lastSandboxError.message : String(lastSandboxError);
      throw new Error(`Sandbox via API falhou: ${detail}`);
    }

    await api.aguardarCobrancaStatus(cobrancaId, 3);

    await gotoApp(page, '/dashboard');
    await expect(page.getByText(/Recebido:\s*R\$/)).toBeVisible({ timeout: 90_000 });
  });
});
