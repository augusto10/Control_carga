import { NextApiRequest, NextApiResponse } from 'next';
import { findPerfil6mMatch, type Perfil6mReferencia } from '@/lib/perfil6m';
import { apiExternaService, type PedidoItemExterno } from '@/services/api-externa';

type Perfil6mMatchBy = 'codigo_barras' | 'codigo_original' | 'descricao';

interface ItemPerfil6mEncontrado {
  itemId: number | null;
  produtoId: number | null;
  produtoNome: string;
  quantidade: number;
  codigoBarras: string | null;
  codigoOriginal: string | null;
  referencia: Perfil6mReferencia;
  matchBy: Perfil6mMatchBy;
}

interface PedidoPerfil6mResult {
  pedidoId: number;
  hasPerfil6m: boolean;
  totalQuantidade: number;
  totalItensPedido: number;
  itens: ItemPerfil6mEncontrado[];
  error?: string;
}

function pickString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function pickNumber(...values: Array<unknown>): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      const normalized = trimmed.replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function parsePedidoIds(query: NextApiRequest['query']): number[] {
  const values = [
    ...(Array.isArray(query.orcamento_ids) ? query.orcamento_ids : [query.orcamento_ids]),
    ...(Array.isArray(query.orcamento_id) ? query.orcamento_id : [query.orcamento_id]),
    ...(Array.isArray(query.pedido_ids) ? query.pedido_ids : [query.pedido_ids]),
  ]
    .filter(Boolean)
    .map((value) => String(value));

  const raw = values.join(',');
  const ids = raw
    .split(',')
    .map((token) => Number(String(token).trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  return Array.from(new Set(ids));
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const runWorker = async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) return;
      results[current] = await worker(items[current]);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(Math.max(concurrency, 1), items.length) }, () => runWorker())
  );

  return results;
}

async function fetchAllPedidoItens(
  pedidoId: number,
  username: string,
  password: string
): Promise<PedidoItemExterno[] | null> {
  const items: PedidoItemExterno[] = [];
  let offset = 0;
  let total: number | null = null;
  let pages = 0;
  let lastPageSignature = '';

  while (pages < 200) {
    const response = await apiExternaService.listarItensPedido(pedidoId, username, password, {
      limit: 100,
      offset,
    });

    if (!response) {
      return items.length > 0 ? items : null;
    }

    const pageItems = Array.isArray(response.data) ? response.data : [];
    if (pageItems.length === 0) break;

    const pageSignature = pageItems
      .map((item) => `${pickString(item.ITEM_ID, item.PRODUTO_ID) || 'na'}:${pickString(item.QUANTIDADE) || '0'}`)
      .join('|');
    if (pageSignature && pageSignature === lastPageSignature) {
      break;
    }
    lastPageSignature = pageSignature;

    items.push(...pageItems);
    pages += 1;

    if (typeof response.total === 'number' && response.total >= 0) {
      total = response.total;
    }

    const step = pageItems.length > 0
      ? pageItems.length
      : (typeof response.limit === 'number' && response.limit > 0 ? response.limit : 0);

    if (step <= 0) break;
    offset += step;

    if (total !== null && offset >= total) break;
  }

  return items;
}

function mapPerfil6mResult(pedidoId: number, itensPedido: PedidoItemExterno[]): PedidoPerfil6mResult {
  const itensEncontrados: ItemPerfil6mEncontrado[] = [];

  for (const item of itensPedido) {
    const produtoNome = pickString(
      item.PRODUTO_NOME,
      (item as any).NOME_PRODUTO,
      (item as any).DESCRICAO,
      (item as any).PRODUTO_DESCRICAO
    ) || 'Produto sem nome';

    const codigoBarras = pickString(item.CODIGO_BARRAS, (item as any).EAN, (item as any).GTIN);
    const codigoOriginal = pickString(
      item.CODIGO_ORIGINAL,
      (item as any).CODIGO,
      (item as any).CODIGO_INTERNO,
      (item as any).REFERENCIA
    );

    const match = findPerfil6mMatch({
      produtoNome,
      codigoBarras,
      codigoOriginal,
    });

    if (!match.match || !match.referencia || !match.matchBy) continue;

    const quantidade = pickNumber(
      item.QUANTIDADE,
      (item as any).QTD,
      (item as any).QUANTIDADE_PEDIDA,
      (item as any).QUANTIDADE_ITEM
    ) || 0;

    itensEncontrados.push({
      itemId: pickNumber(item.ITEM_ID) ?? null,
      produtoId: pickNumber(item.PRODUTO_ID, (item as any).ID_PRODUTO) ?? null,
      produtoNome,
      quantidade,
      codigoBarras,
      codigoOriginal,
      referencia: match.referencia,
      matchBy: match.matchBy,
    });
  }

  return {
    pedidoId,
    hasPerfil6m: itensEncontrados.length > 0,
    totalQuantidade: itensEncontrados.reduce((sum, item) => sum + (item.quantidade || 0), 0),
    totalItensPedido: itensPedido.length,
    itens: itensEncontrados,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  const pedidoIds = parsePedidoIds(req.query);
  if (pedidoIds.length === 0) {
    return res.status(400).json({ error: 'Informe ao menos um pedido via orcamento_ids' });
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;
  if (!username || !password) {
    return res.status(500).json({ error: 'Credenciais da API externa nao configuradas' });
  }

  try {
    const results = await runWithConcurrency(
      pedidoIds,
      5,
      async (pedidoId): Promise<PedidoPerfil6mResult> => {
        try {
          const itensPedido = await fetchAllPedidoItens(pedidoId, username, password);
          if (!itensPedido) {
            return {
              pedidoId,
              hasPerfil6m: false,
              totalQuantidade: 0,
              totalItensPedido: 0,
              itens: [],
              error: 'Nao foi possivel consultar itens do pedido',
            };
          }
          return mapPerfil6mResult(pedidoId, itensPedido);
        } catch (error: any) {
          console.error(`[API Perfil 6M] Erro no pedido ${pedidoId}:`, error?.message || error);
          return {
            pedidoId,
            hasPerfil6m: false,
            totalQuantidade: 0,
            totalItensPedido: 0,
            itens: [],
            error: error?.message || 'Erro interno',
          };
        }
      }
    );

    const data = results.reduce<Record<number, PedidoPerfil6mResult>>((acc, result) => {
      acc[result.pedidoId] = result;
      return acc;
    }, {});

    const pedidosComPerfil6m = results.filter((result) => result.hasPerfil6m).length;
    const itensPerfil6m = results.reduce((sum, result) => sum + result.itens.length, 0);

    return res.status(200).json({
      data,
      meta: {
        totalPedidos: pedidoIds.length,
        pedidosComPerfil6m,
        itensPerfil6m,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[API Perfil 6M] Erro geral:', error?.message || error);
    return res.status(500).json({ error: 'Erro interno ao analisar pedidos' });
  }
}
