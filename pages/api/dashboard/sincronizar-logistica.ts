import type { NextApiRequest, NextApiResponse } from 'next';
import { sincronizarLogisticaSnapshot } from '@/lib/logistica-snapshot';

const parseDateOnly = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : normalized;
};

const todayIso = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
};

const isAuthorized = (req: NextApiRequest) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';

  const header = req.headers.authorization || '';
  const token = Array.isArray(header) ? header[0] : header;
  return token === `Bearer ${cronSecret}` || req.query.secret === cronSecret;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Nao autorizado' });
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;
  if (!username || !password) {
    return res.status(500).json({ error: 'Credenciais da API externa nao configuradas' });
  }

  const dataInicioIso = parseDateOnly(req.query.data_inicio) || todayIso();
  const dataFimIso = parseDateOnly(req.query.data_fim) || dataInicioIso;
  const limit = Math.min(Math.max(Number(req.query.limit || 150), 1), 500);
  const maxDetalhes = Math.min(Math.max(Number(req.query.max_detalhes ?? 30), 0), 100);

  try {
    const resultado = await sincronizarLogisticaSnapshot({
      username,
      password,
      dataInicioIso,
      dataFimIso,
      limit,
      maxDetalhes,
    });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('[Sincronizacao Logistica] Erro:', error);
    return res.status(503).json({
      error: 'API externa indisponivel para sincronizacao',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
}
