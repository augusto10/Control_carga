import type { NextApiResponse } from 'next';
import automationPrisma from '@/lib/automation-prisma';
import {
  AgentAuthenticatedRequest,
  withAgentAuth,
} from '@/lib/middleware/withAgentAuth';

/**
 * POST /api/automacao/jobs/[id]/heartbeat
 *
 * O agent avisa que o job RUNNING ainda está em execução.
 * Só vale para jobs que ESTE agent está executando.
 */
async function handler(req: AgentAuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.status(400).json({ success: false, message: 'id do job é obrigatório' });
  }

  try {
    const updated = await automationPrisma.job.updateMany({
      where: { id, status: 'RUNNING', agentId: req.agent.id },
      data: { lastHeartbeatAt: new Date() },
    });

    if (updated.count === 0) {
      return res.status(409).json({
        success: false,
        message: 'Job não está em execução por este agent.',
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no heartbeat do job:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

export default withAgentAuth(handler);
