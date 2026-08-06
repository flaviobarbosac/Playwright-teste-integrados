import { randomUUID } from 'node:crypto';
import { getApiBaseUrl } from './session';
import type { ClampfySession } from './session';

export interface GoogleProntidaoDto {
  conectado: boolean;
  drivePronto: boolean;
  calendarPronto: boolean;
  pendencias: string[];
}

export interface PropostaResumoDto {
  id: string;
  titulo?: string | null;
  clienteId: string;
}

export interface CriarPropostaInput {
  clienteId: string;
  titulo: string;
  itens: Array<{ descricao: string; quantidade: number; valorUnitario: number }>;
}

export class ClampfyApiClient {
  constructor(private readonly session: ClampfySession) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.session.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(method: string, path: string, body?: unknown, retries = 5): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch(`${getApiBaseUrl()}${path}`, {
        method,
        headers: this.headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (response.status === 429 && attempt < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2_000 * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        const text = await response.text();
        lastError = new Error(`${method} ${path} → ${response.status}: ${text}`);
        throw lastError;
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    }

    throw lastError ?? new Error(`${method} ${path} failed after retries`);
  }

  async getGoogleProntidao(): Promise<GoogleProntidaoDto> {
    return this.request('GET', '/google/prontidao');
  }

  isGooglePronto(prontidao: GoogleProntidaoDto): boolean {
    return prontidao.conectado && prontidao.drivePronto && prontidao.calendarPronto;
  }

  async enviarProposta(propostaId: string): Promise<{ token: string; url: string }> {
    return this.request('POST', `/proposta/${propostaId}/enviar`, { enviarEmail: false });
  }

  async aceitarPropostaPortal(token: string): Promise<{ status: number }> {
    const response = await fetch(`${getApiBaseUrl()}/portal/proposta/${token}/aceitar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formaPagamento: 1, parcelas: 1 }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`POST portal aceitar → ${response.status}: ${text}`);
    }
    return (await response.json()) as { status: number };
  }

  async criarProposta(input: CriarPropostaInput): Promise<PropostaResumoDto> {
    const itens = input.itens.map((item) => ({
      id: randomUUID(),
      descricao: item.descricao,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      total: item.quantidade * item.valorUnitario,
    }));
    const valorTotal = itens.reduce((sum, item) => sum + item.total, 0);

    return this.request('POST', '/proposta', {
      clienteId: input.clienteId,
      titulo: input.titulo,
      status: 1,
      valorTotal,
      permitePix: true,
      permiteBoleto: false,
      permiteCartao: false,
      maxParcelas: 1,
      vencimentoDias: 7,
      itens,
    });
  }

  async listarCobrancasDaProposta(propostaId: string): Promise<Array<{ id: string; status: number }>> {
    return this.request('GET', `/proposta/${propostaId}/cobrancas`);
  }

  async listarPropostas(): Promise<PropostaResumoDto[]> {
    return this.request('GET', '/proposta');
  }

  async criarCobrancaProposta(
    propostaId: string,
    valor: number,
    formaPagamento = 1,
  ): Promise<{ id: string }> {
    return this.request('POST', `/proposta/${propostaId}/criar-cobranca`, {
      valor,
      formaPagamento,
      parcelas: 1,
    });
  }
}

export function createApiClient(session: ClampfySession): ClampfyApiClient {
  return new ClampfyApiClient(session);
}
