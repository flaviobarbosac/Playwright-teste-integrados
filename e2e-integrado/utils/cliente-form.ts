import type { Page } from '@playwright/test';
import type { Pessoa4Devs } from './4devs';

export async function cadastrarClientePf(page: Page, pessoa: Pessoa4Devs): Promise<string> {
  await page.goto('/clientes/novo');
  await page.getByLabel('CPF/CNPJ').fill(pessoa.cpf);
  await page.getByLabel('Nome / Razão social').fill(pessoa.nome);
  await page.getByLabel('E-mail').fill(pessoa.email);

  const telefone = pessoa.celular ?? pessoa.telefone_fixo;
  const telefoneField = page.getByLabel('Telefone');
  if (telefone && (await telefoneField.count()) > 0) {
    await telefoneField.fill(telefone.replace(/\D/g, '').slice(-9));
  }

  await page.locator('button[form="cliente-form"]').click();
  await page.waitForURL(/\/clientes\/[0-9a-f-]+$/i);

  const match = page.url().match(/\/clientes\/([0-9a-f-]+)$/i);
  if (!match?.[1]) {
    throw new Error('Cadastro de cliente não redirecionou para o hub');
  }
  return match[1];
}
