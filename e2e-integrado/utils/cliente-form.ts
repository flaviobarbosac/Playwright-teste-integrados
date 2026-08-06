import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { fetchPessoa4Devs, type Pessoa4Devs } from './4devs';
import { gotoApp } from './app-url';
import { parseTelefoneBr } from './telefone';

const DEFAULT_MAX_TENTATIVAS = 15;

async function aguardarCadastroComSucesso(page: Page): Promise<void> {
  const resultado = await Promise.race([
    page
      .waitForURL(/\/clientes\/[0-9a-f-]+$/i, { timeout: 45_000, waitUntil: 'domcontentloaded' })
      .then(() => 'ok' as const),
    page
      .locator('.MuiFormHelperText-root.Mui-error, [role="alert"]')
      .first()
      .waitFor({ state: 'visible', timeout: 45_000 })
      .then(() => 'erro' as const),
  ]).catch(() => 'timeout' as const);

  if (resultado === 'ok') {
    return;
  }

  if (resultado === 'erro') {
    const mensagem =
      (await page.locator('.MuiFormHelperText-root.Mui-error, [role="alert"]').first().textContent())?.trim() ||
      'Erro ao cadastrar cliente';
    throw new Error(mensagem);
  }

  throw new Error('Timeout ao cadastrar cliente');
}

export async function preencherFormularioClientePf(page: Page, pessoa: Pessoa4Devs): Promise<void> {
  await page.getByLabel('CPF/CNPJ').fill(pessoa.cpf);
  await page.getByLabel('Nome / Razão social').fill(pessoa.nome);

  const apelido = pessoa.nome.split(' ')[0] ?? 'E2E';
  await page.getByLabel(/Apelido|Nome Fantasia/).fill(`Apelido ${apelido}`);

  if (pessoa.email) {
    await page.getByLabel('E-mail').fill(pessoa.email);
  }

  const { ddd, telefone } = parseTelefoneBr(pessoa.celular ?? pessoa.telefone_fixo);
  if (ddd) {
    await page.getByLabel('DDD').fill(ddd);
  }
  if (telefone) {
    await page.getByLabel('Telefone', { exact: true }).fill(telefone);
  }

  if (pessoa.endereco) {
    await page.getByLabel('Logradouro').fill(pessoa.endereco);
  }
  if (pessoa.bairro) {
    await page.getByLabel('Bairro').fill(pessoa.bairro);
  }
  if (pessoa.cidade) {
    await page.getByRole('textbox', { name: 'Cidade', exact: true }).fill(pessoa.cidade);
  }
  if (pessoa.estado) {
    await page.getByLabel('UF').click();
    await page.locator(`li[role="option"][data-value="${pessoa.estado}"]`).click();
  }
  if (pessoa.cep) {
    await page.getByLabel('CEP').fill(pessoa.cep.replace(/\D/g, ''));
    await page.getByLabel('CEP').blur();
    await expect(page.getByLabel('Código IBGE cidade')).not.toHaveValue('', { timeout: 15_000 }).catch(
      () => undefined,
    );
  }
  if (pessoa.numero != null && String(pessoa.numero).trim()) {
    await page.getByLabel('Número').fill(String(pessoa.numero));
  }
  await page.getByLabel('Complemento').fill('Sala E2E');
}

export async function salvarFormularioCliente(page: Page, formId = 'cliente-form'): Promise<void> {
  const saveButton = page.locator(`button[form="${formId}"]`);
  await saveButton.scrollIntoViewIfNeeded();
  await saveButton.click();
}

export function extrairClienteIdDaUrl(page: Page): string {
  const match = page.url().match(/\/clientes\/([0-9a-f-]+)/i);
  if (!match?.[1]) {
    throw new Error('URL do cliente não encontrada');
  }
  return match[1];
}

export async function cadastrarClientePf(page: Page, pessoa: Pessoa4Devs): Promise<string> {
  await gotoApp(page, '/clientes/novo');
  await expect(page.getByRole('heading', { name: 'Novo cliente' })).toBeVisible({ timeout: 30_000 });
  await preencherFormularioClientePf(page, pessoa);
  await salvarFormularioCliente(page);
  await aguardarCadastroComSucesso(page);
  await expect(page.getByText('Cliente cadastrado.')).toBeVisible({ timeout: 10_000 }).catch(
    () => undefined,
  );
  return extrairClienteIdDaUrl(page);
}

export interface CadastrarClientePf4DevsOptions {
  maxTentativas?: number;
  nome?: (pessoa: Pessoa4Devs) => string;
}

export interface CadastrarClientePf4DevsResult {
  clienteId: string;
  pessoa: Pessoa4Devs;
}

/** Busca pessoa no 4Devs e repete até o cliente ser gravado com sucesso. */
export async function cadastrarClientePf4Devs(
  page: Page,
  options: CadastrarClientePf4DevsOptions = {},
): Promise<CadastrarClientePf4DevsResult> {
  const maxTentativas = options.maxTentativas ?? DEFAULT_MAX_TENTATIVAS;
  let lastError: unknown;

  for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
    const pessoa = await fetchPessoa4Devs();
    if (options.nome) {
      pessoa.nome = options.nome(pessoa);
    }
    pessoa.email = `e2e.${Date.now()}.${tentativa}@4devs.test`;

    try {
      const clienteId = await cadastrarClientePf(page, pessoa);
      return { clienteId, pessoa };
    } catch (error) {
      lastError = error;
      // próxima iteração: nova pessoa do 4Devs
    }
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Não foi possível gravar cliente após ${maxTentativas} tentativas com 4Devs. Último erro: ${detail}`,
  );
}
