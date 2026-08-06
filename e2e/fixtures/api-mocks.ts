import type { BrowserContext, Route } from '@playwright/test';
import { TEST_SESSION, TEST_USUARIO } from './test-data';

export interface ClienteMock {
  id: string;
  nome: string;
  cpfCnpj: string;
  email?: string | null;
  telefone?: string | null;
  ddd?: string | null;
  cidade?: string | null;
  uf?: string | null;
  deletedAt?: string | null;
}

export interface ClientesMockState {
  clientes: ClienteMock[];
}

function json(route: Route, body: unknown, status = 200, headers: Record<string, string> = {}) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers,
    body: JSON.stringify(body),
  });
}

function emptyList(route: Route) {
  return json(route, [], 200, { 'x-total-count': '0' });
}

function apiPath(url: string): string | null {
  const match = url.match(/\/api\/v1(\/.*)$/i);
  return match?.[1] ?? null;
}

export async function setupClientesApiMocks(
  context: BrowserContext,
  state: ClientesMockState,
): Promise<void> {
  await context.route(/\/api\/v1\//i, async (route) => {
    const path = apiPath(route.request().url());
    if (!path) return route.continue();

    const method = route.request().method();

    if (method === 'POST' && path === '/auth/refresh') {
      return json(route, {
        usuarioId: TEST_SESSION.usuarioId,
        nome: TEST_SESSION.nome,
        dispositivoId: TEST_SESSION.dispositivoId,
        accessToken: TEST_SESSION.accessToken,
        refreshToken: TEST_SESSION.refreshToken,
        expiraEm: TEST_SESSION.expiraEm,
        refreshExpiraEm: TEST_SESSION.refreshExpiraEm,
      });
    }

    if (method === 'GET' && path === `/Usuario/${TEST_USUARIO.id}`) {
      return json(route, TEST_USUARIO);
    }

    if (method === 'GET' && path === '/usuario/configuracoes') {
      return json(route, { integracoes: [], preferencias: {} });
    }

    if (method === 'GET' && path === '/usuario/configuracoes/integracoes/pendencias') {
      return json(route, []);
    }

    if (method === 'GET' && path === '/plano-assinatura/status') {
      return json(route, { assinaturaStatus: 1, statusConta: 1 });
    }

    if (method === 'GET' && path === '/plano-assinatura/faturas') {
      return json(route, []);
    }

    if (method === 'GET' && path === '/nfse/prontidao') {
      return json(route, { prontoParaEmitir: false, itens: [] });
    }

    if (method === 'GET' && path === '/google/prontidao') {
      return json(route, {
        conectado: true,
        drivePronto: true,
        calendarPronto: true,
        pendencias: [],
      });
    }

    if (method === 'GET' && path === '/google/conexao') {
      return json(route, {
        contaAutenticada: true,
        workspaceConectado: true,
        conectado: true,
        googleEmail: 'e2e@clampfy.test',
      });
    }

    if (method === 'GET' && path === '/wallet/saldo') {
      return json(route, { saldoDisponivel: 0, saldoBloqueado: 0 });
    }

    if (method === 'GET' && path === '/plano/features') {
      return json(route, {
        plano: 2,
        podeUsarBoletoCartao: true,
        podeUsarAssistenteIa: true,
        podeReservarAgendaViaProposta: true,
        podeEmitirNfseAutomatico: true,
        podeUsarFormalizacao2027: true,
        exibeAnuncios: false,
        boletosInclusos: 10,
        nfseInclusos: 10,
        boletosUsados: 0,
        nfseUsados: 0,
      });
    }

    if (method === 'GET' && ['/Proposta', '/Contrato', '/Cobranca'].includes(path)) {
      return emptyList(route);
    }

    if (method === 'GET' && path === '/Cliente') {
      const url = new URL(route.request().url());
      const excluidos = url.searchParams.get('excluidos');
      const items =
        excluidos === 'only'
          ? state.clientes.filter((c) => c.deletedAt)
          : state.clientes.filter((c) => !c.deletedAt);
      return json(route, items, 200, { 'x-total-count': String(items.length) });
    }

    const clienteMatch = path.match(/^\/Cliente\/([^/]+)$/);
    if (method === 'GET' && clienteMatch) {
      const cliente = state.clientes.find((c) => c.id === clienteMatch[1]);
      if (!cliente) return json(route, { message: 'Not found' }, 404);
      return json(route, cliente);
    }

    if (method === 'POST' && path === '/Cliente') {
      const payload = route.request().postDataJSON() as ClienteMock;
      const created: ClienteMock = {
        id: crypto.randomUUID(),
        nome: payload.nome,
        cpfCnpj: payload.cpfCnpj,
        email: payload.email ?? null,
        telefone: payload.telefone ?? null,
        ddd: payload.ddd ?? null,
        cidade: payload.cidade ?? null,
        uf: payload.uf ?? null,
        deletedAt: null,
      };
      state.clientes.push(created);
      return json(route, created, 201);
    }

    if (method === 'PUT' && clienteMatch) {
      const payload = route.request().postDataJSON() as ClienteMock;
      const index = state.clientes.findIndex((c) => c.id === clienteMatch[1]);
      if (index < 0) return json(route, { message: 'Not found' }, 404);
      state.clientes[index] = { ...state.clientes[index], ...payload, id: clienteMatch[1] };
      return json(route, state.clientes[index]);
    }

    if (method === 'DELETE' && clienteMatch) {
      const index = state.clientes.findIndex((c) => c.id === clienteMatch[1]);
      if (index < 0) return json(route, { message: 'Not found' }, 404);
      state.clientes[index] = {
        ...state.clientes[index],
        deletedAt: new Date().toISOString(),
      };
      return route.fulfill({ status: 204, body: '' });
    }

    return json(route, {});
  });
}
