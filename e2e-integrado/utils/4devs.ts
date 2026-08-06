import { FOUR_DEVS_URL } from '../constants';
import { gerarCpfValido } from './cpf';

/** Person record from https://www.4devs.com.br/ gerador de pessoas. */
export interface Pessoa4Devs {
  nome: string;
  cpf: string;
  email: string;
  celular?: string;
  telefone_fixo?: string;
  cep?: string;
  endereco?: string;
  numero?: number | string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

interface RawPessoa4Devs {
  nome?: string;
  cpf?: string;
  email?: string;
  celular?: string;
  telefone_fixo?: string;
  cep?: string;
  endereco?: string;
  numero?: number | string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}

/**
 * Fetches one synthetic person from 4Devs (free online generator).
 * @see https://www.4devs.com.br/
 */
export async function fetchPessoa4Devs(): Promise<Pessoa4Devs> {
  const body = new URLSearchParams({
    acao: 'gerar_pessoa',
    sexo: 'I',
    pontuacao: 'S',
    idade: '0',
    cep_estado: '',
    txt_qtde: '1',
    cep_cidade: '',
  });

  const response = await fetch(FOUR_DEVS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`4Devs respondeu ${response.status}`);
  }

  const data = (await response.json()) as RawPessoa4Devs[];
  const raw = data[0];
  if (!raw?.nome || !raw?.cpf) {
    throw new Error('4Devs não retornou pessoa válida');
  }

  return {
    nome: raw.nome,
    cpf: gerarCpfValido(),
    email: raw.email ?? `e2e.${Date.now()}@4devs.test`,
    celular: raw.celular,
    telefone_fixo: raw.telefone_fixo,
    cep: raw.cep,
    endereco: raw.endereco,
    numero: raw.numero,
    bairro: raw.bairro,
    cidade: raw.cidade,
    estado: raw.estado,
  };
}
