import type { NextApiResponse } from 'next';
import automationPrisma from '@/lib/automation-prisma';
import {
  AgentAuthenticatedRequest,
  withAgentAuth,
} from '@/lib/middleware/withAgentAuth';

/**
 * POST /api/automacao/jobs/[id]/complete
 *
 * O agent reporta o resultado do job que está executando.
 *
 * Body:
 *   { "success": true,  "result": { ...qualquer JSON... } }
 *   { "success": false, "errorMessage": "motivo da falha" }
 *
 * Só vale para jobs RUNNING que ESTE agent está executando.
 */
async function handler(req: AgentAuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.status(400).json({ success: false, message: 'id do job é obrigatório' });
  }

  const success = req.body?.success;
  if (typeof success !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'Informe "success": true|false no body.',
    });
  }

  const errorMessage =
    typeof req.body?.errorMessage === 'string' && req.body.errorMessage.trim()
      ? req.body.errorMessage.trim()
      : null;

  if (!success && !errorMessage) {
    return res.status(400).json({
      success: false,
      message: 'Falha sem errorMessage: descreva o motivo.',
    });
  }

  try {
    const updated = await automationPrisma.job.updateMany({
      where: { id, status: 'RUNNING', agentId: req.agent.id },
      data: {
        status: success ? 'SUCCESS' : 'FAILED',
        result: success ? (req.body?.result ?? null) : undefined,
        errorMessage: success ? null : errorMessage,
        finishedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return res.status(409).json({
        success: false,
        message: 'Job não está em execução por este agent.',
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao concluir job:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

export default withAgentAuth(handler);
