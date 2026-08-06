import { getApiBaseUrl } from './session';
import type { ClampfySession } from './session';

export class ClampfyApiClient {
  constructor(private readonly session: ClampfySession) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.session.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`${method} ${path} → ${response.status}: ${text}`);
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
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

  async listarCobrancasDaProposta(propostaId: string): Promise<Array<{ id: string; status: number }>> {
    return this.request('GET', `/proposta/${propostaId}/cobrancas`);
  }
}

export function createApiClient(session: ClampfySession): ClampfyApiClient {
  return new ClampfyApiClient(session);
}
