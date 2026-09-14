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

const diasAntesIso = (dias: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dias).toISOString().slice(0, 10);
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

  // O cron externo normalmente chama a rota sem periodo. Nesse caso ele deve
  // renovar exatamente a mesma janela de 30 dias usada pelos alertas.
  const dataFimIso = parseDateOnly(req.query.data_fim) || todayIso();
  const dataInicioIso = parseDateOnly(req.query.data_inicio) || diasAntesIso(29);
  const limit = Math.min(Math.max(Number(req.query.limit || 500), 1), 500);
  // Detalhes individuais servem apenas para listar produtos de pendencias
  // confirmadas. Um limite moderado impede que o cron estoure a execucao.
  const maxDetalhes = Math.min(Math.max(Number(req.query.max_detalhes ?? 20), 0), 100);

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
