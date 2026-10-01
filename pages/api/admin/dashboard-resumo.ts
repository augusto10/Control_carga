import { NextApiRequest, NextApiResponse } from 'next';
import { startOfDay, startOfMonth, endOfDay } from 'date-fns';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';

type DashboardResumoPayload = {
  totalUsuarios: number;
  usuariosAtivos: number;
  totalControles: number;
  controlesPendentes: number;
  pedidosHoje: number;
  pedidosMes: number;
  ultimosUsuarios: Array<{
    id: string;
    nome: string;
    email: string;
    ultimoAcesso: string | null;
  }>;
  cached?: boolean;
  stale?: boolean;
  warning?: string;
};

const DASHBOARD_CACHE_TTL_MS = 60_000;
const DASHBOARD_STALE_TTL_MS = 10 * 60_000;
const PEDIDOS_CACHE_TTL_MS = 5 * 60_000;
const PEDIDOS_CACHE_STALE_TTL_MS = 20 * 60_000;
const EXTERNAL_PAGE_SIZE = 100;
const EXTERNAL_MAX_RECORDS = 1500;

let dashboardCache: {
  expiresAt: number;
  staleAt: number;
  payload: DashboardResumoPayload;
} | null = null;

let pedidosCache: {
  expiresAt: number;
  staleAt: number;
  pedidos: any[];
} | null = null;

let pedidosRefreshPromise: Promise<any[]> | null = null;

const parseNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const getEmpresaId = (pedido: Record<string, any>) =>
  parseNumber(pedido.EMPRESA_ID) ??
  parseNumber(pedido.EMPRESAID) ??
  parseNumber(pedido.ID_EMPRESA) ??
  parseNumber(pedido.EMPRESA);

const isPedidoFechado = (pedido: Record<string, any>) =>
  String(pedido.PEDIDO_FECHADO ?? pedido.pedido_fechado ?? '').toUpperCase() === 'S';

const isPedidoEntrega = (pedido: Record<string, any>) => {
  const tipoEntrega = String(pedido.TIPO_ENTREGA ?? pedido.tipo_entrega ?? '').toUpperCase();
  return tipoEntrega !== 'ATO' && tipoEntrega !== 'NDF';
};

const parsePedidoDate = (value: unknown): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (raw.includes('T')) {
    const [datePart, timePart = '00:00:00'] = raw.split('T');
    const [year, month, day] = datePart.split('-').map((n) => Number(n));
    const [hh = 0, mm = 0, ssRaw = 0] = timePart.replace(/Z$/, '').split(':').map((n) => Number(n));
    const ss = Number.isFinite(ssRaw) ? Math.floor(ssRaw) : 0;
    const parsed = new Date(year, month - 1, day, hh || 0, mm || 0, ss);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(raw)) {
    const [datePart, timePart] = raw.split(' ');
    const [day, month, year] = datePart.split('/').map((n) => Number(n));
    const [hh = 0, mm = 0, ss = 0] = (timePart || '').split(':').map((n) => Number(n));
    const parsed = new Date(year, month - 1, day, hh, mm, ss);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getPedidoRecebimento = (pedido: Record<string, any>) =>
  parsePedidoDate(
    pedido.DATA_HORA_RECEBIMENTO ??
    pedido.data_hora_recebimento ??
    pedido.DATA_RECEBIMENTO ??
    pedido.data_recebimento ??
    pedido.PEDIDO_DATA_FECHAMENTO ??
    pedido.PEDIDO_DATA_CADASTRO ??
    pedido.DATA_HORA_CADASTRO ??
    pedido.DATA_CADASTRO ??
    pedido.DATA_EMISSAO ??
    null
  );

const carregarPedidosBase = async () => {
  if (pedidosRefreshPromise) return pedidosRefreshPromise;

  pedidosRefreshPromise = (async () => {
    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      return [];
    }

    const pedidos: any[] = [];

    for (let offset = 0; offset < EXTERNAL_MAX_RECORDS; offset += EXTERNAL_PAGE_SIZE) {
      const response = await apiExternaService.listarPedidos(
        { limit: EXTERNAL_PAGE_SIZE, offset, tipo_data: 'recebimento' },
        username,
        password,
        8_000
      );

      const page = Array.isArray(response?.data) ? response.data : [];
      if (page.length === 0) break;

      pedidos.push(...page);

      if (page.length < EXTERNAL_PAGE_SIZE) break;
      if (typeof response?.total === 'number' && response.total > 0 && offset + page.length >= response.total) {
        break;
      }
    }

    pedidosCache = {
      expiresAt: Date.now() + PEDIDOS_CACHE_TTL_MS,
      staleAt: Date.now() + PEDIDOS_CACHE_STALE_TTL_MS,
      pedidos
    };

    return pedidos;
  })().finally(() => {
    pedidosRefreshPromise = null;
  });

  return pedidosRefreshPromise;
};

const getPedidosBase = async () => {
  const now = Date.now();
  if (pedidosCache && pedidosCache.expiresAt > now) return pedidosCache.pedidos;

  if (pedidosCache && pedidosCache.staleAt > now) {
    void carregarPedidosBase().catch((error: any) => {
      console.error('[Admin Dashboard Resumo] Falha ao atualizar cache de pedidos:', error?.message || error);
    });
    return pedidosCache.pedidos;
  }

  return carregarPedidosBase();
};

const calcularPedidosResumo = async (referencia: Date) => {
  const inicioHoje = startOfDay(referencia);
  const fimHoje = endOfDay(referencia);
  const inicioMes = startOfMonth(referencia);

  const pedidos = await getPedidosBase();

  let pedidosHoje = 0;
  let pedidosMes = 0;

  for (const pedido of pedidos) {
    const recebimento = getPedidoRecebimento(pedido);
    if (!recebimento) continue;
    if (getEmpresaId(pedido) !== 1) continue;
    if (!isPedidoFechado(pedido)) continue;
    if (!isPedidoEntrega(pedido)) continue;

    if (recebimento >= inicioMes && recebimento <= fimHoje) {
      pedidosMes += 1;
    }

    if (recebimento >= inicioHoje && recebimento <= fimHoje) {
      pedidosHoje += 1;
    }
  }

  return { pedidosHoje, pedidosMes };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'private, max-age=15, stale-while-revalidate=120');

  if (dashboardCache && dashboardCache.expiresAt > Date.now()) {
    return res.status(200).json({ ...dashboardCache.payload, cached: true });
  }

  try {
    const agora = new Date();

    const [
      totalUsuarios,
      usuariosAtivos,
      totalControles,
      controlesPendentes,
      ultimosUsuarios,
      pedidosResumo
    ] = await Promise.all([
      prisma.usuario.count(),
      prisma.usuario.count({ where: { ativo: true } }),
      prisma.controleCarga.count(),
      prisma.controleCarga.count({ where: { finalizado: false } }),
      prisma.usuario.findMany({
        orderBy: { dataCriacao: 'desc' },
        take: 5,
        select: {
          id: true,
          nome: true,
          email: true,
          ultimoAcesso: true
        }
      }),
      calcularPedidosResumo(agora)
    ]);

    const payload: DashboardResumoPayload = {
      totalUsuarios,
      usuariosAtivos,
      totalControles,
      controlesPendentes,
      pedidosHoje: pedidosResumo.pedidosHoje,
      pedidosMes: pedidosResumo.pedidosMes,
      ultimosUsuarios: ultimosUsuarios.map((usuario) => ({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        ultimoAcesso: usuario.ultimoAcesso ? usuario.ultimoAcesso.toISOString() : null
      }))
    };

    dashboardCache = {
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
      staleAt: Date.now() + DASHBOARD_STALE_TTL_MS,
      payload
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error('[Admin Dashboard Resumo] Erro ao buscar resumo:', error);

    if (dashboardCache && dashboardCache.staleAt > Date.now()) {
      return res.status(200).json({
        ...dashboardCache.payload,
        stale: true,
        warning: 'API externa demorou para responder. Exibindo o ultimo resumo em cache.'
      });
    }

    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
