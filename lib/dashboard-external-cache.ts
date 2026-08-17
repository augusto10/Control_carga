import { apiExternaService } from '@/services/api-externa';

const PEDIDOS_CACHE_TTL_MS = 10 * 60_000;
const PEDIDOS_TIMEOUT_MS = 8_000;

type PedidoDashboard = Record<string, unknown>;

const cache = new Map<string, { expiresAt: number; data: PedidoDashboard[] }>();
const pending = new Map<string, Promise<PedidoDashboard[] | null>>();

export async function getPedidosDashboard(
  username: string,
  password: string,
  limit = 100
): Promise<PedidoDashboard[] | null> {
  const key = `${username}:${limit}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const current = pending.get(key);
  if (current) return current;

  const request = (async () => {
    try {
      const response = await apiExternaService.listarPedidos(
        { limit, offset: 0 },
        username,
        password,
        PEDIDOS_TIMEOUT_MS
      );
      if (!response) return null;

      const data = (response.data || []) as PedidoDashboard[];
      cache.set(key, { expiresAt: Date.now() + PEDIDOS_CACHE_TTL_MS, data });
      return data;
    } finally {
      pending.delete(key);
    }
  })();

  pending.set(key, request);
  return request;
}
