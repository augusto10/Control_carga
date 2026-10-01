import { apiExternaService } from '@/services/api-externa';

const PEDIDOS_CACHE_TTL_MS = 30_000;
const PEDIDOS_STALE_TTL_MS = 10 * 60_000;
const PEDIDOS_TIMEOUT_MS = 8_000;

type PedidoDashboard = Record<string, unknown>;

const cache = new Map<
  string,
  { expiresAt: number; staleAt: number; data: PedidoDashboard[] }
>();
const pending = new Map<string, Promise<PedidoDashboard[] | null>>();

export async function getPedidosDashboard(
  username: string,
  password: string,
  limit = 100,
  timeoutMs = PEDIDOS_TIMEOUT_MS,
  filtros: Pick<
    Parameters<typeof apiExternaService.listarPedidos>[0],
    'data_inicio' | 'data_fim' | 'tipo_data'
  > = {}
): Promise<PedidoDashboard[] | null> {
  const key = `${username}:${limit}:${filtros.data_inicio || ''}:${filtros.data_fim || ''}:${filtros.tipo_data || ''}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const current = pending.get(key);
  if (current) return current;

  const request = (async () => {
    try {
      const pageSize = Math.min(Math.max(limit, 1), 100);
      const offsets = Array.from(
        { length: Math.ceil(limit / pageSize) },
        (_, index) => index * pageSize
      );
      // O ERP limita chamadas simultaneas e pode expirar o login quando as
      // paginas sao abertas em paralelo. A sequencia preserva o mesmo token.
      let responses: Awaited<ReturnType<typeof apiExternaService.listarPedidos>>[] = [];
      for (const offset of offsets) {
        responses.push(await apiExternaService.listarPedidos(
          { ...filtros, limit: Math.min(pageSize, limit - offset), offset },
          username,
          password,
          timeoutMs
        ));
      }

      const failedOffsets = offsets.filter((_, index) => !responses[index]);
      if (failedOffsets.length > 0) {
        const retries: Awaited<ReturnType<typeof apiExternaService.listarPedidos>>[] = [];
        for (const offset of failedOffsets) {
          retries.push(await apiExternaService.listarPedidos(
            { ...filtros, limit: Math.min(pageSize, limit - offset), offset },
            username,
            password,
            timeoutMs
          ));
        }
        responses = responses.map((response, index) => {
          if (response) return response;
          const retryIndex = failedOffsets.indexOf(offsets[index]);
          return retryIndex >= 0 ? retries[retryIndex] : response;
        });
      }

      const data = responses.flatMap(
        (response) => ((response?.data || []) as PedidoDashboard[])
      );

      if (data.length === 0) {
        const stale = cache.get(key);
        return stale && stale.staleAt > Date.now() ? stale.data : null;
      }

      cache.set(key, {
        expiresAt: Date.now() + PEDIDOS_CACHE_TTL_MS,
        staleAt: Date.now() + PEDIDOS_STALE_TTL_MS,
        data,
      });
      return data;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, request);
  return request;
}
