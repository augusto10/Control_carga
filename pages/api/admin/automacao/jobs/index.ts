import type { NextApiResponse } from 'next';
import automationPrisma from '@/lib/automation-prisma';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

const ADMIN_ROLES = new Set(['ADMIN', 'GERENTE']);
const PAGE_SIZE = 20;

const JOB_STATUSES = new Set(['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED']);

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!ADMIN_ROLES.has(req.user.tipo)) {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const cursor = first(req.query.cursor);
    const status = first(req.query.status);
    const agentId = first(req.query.agentId);
    const type = first(req.query.type);

    const where: Record<string, unknown> = {};
    if (status && JOB_STATUSES.has(status)) where.status = status;
    if (agentId) where.agentId = agentId;
    if (type) where.type = type;

    const jobs = await automationPrisma.job.findMany({
      where,
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        type: true,
        status: true,
        payload: true,
        result: true,
        errorMessage: true,
        attempts: true,
        createdAt: true,
        startedAt: true,
        lastHeartbeatAt: true,
        finishedAt: true,
        agent: { select: { id: true, agentCode: true, name: true } },
      },
    });

    const nextCursor = jobs.length === PAGE_SIZE ? jobs[jobs.length - 1].id : null;

    return res.status(200).json({ jobs, nextCursor });
  } catch (error) {
    console.error('Erro ao listar jobs de automação:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default withAuth(handler);
