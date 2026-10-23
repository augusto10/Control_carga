import type { NextApiResponse } from 'next';
import automationPrisma from '@/lib/automation-prisma';
import {
  AgentAuthenticatedRequest,
  withAgentAuth,
} from '@/lib/middleware/withAgentAuth';

/**
 * POST /api/automacao/jobs/claim
 *
 * O agent pede o próximo job da fila. Resposta:
 * - 200 { job: { id, type, payload } }   — job marcado RUNNING
 * - 200 { job: null }                    — fila vazia (agent volta a fazer polling)
 *
 * Body opcional: { "types": ["ASSOCIAR_PEDIDO_SEPARADOR"] } para restringir
 * os tipos que este agent processa. Sem `types`, qualquer job QUEUED vale.
 *
 * A marcação é atômica (updateMany com `status: QUEUED` na condição):
 * dois agents fazendo claim ao mesmo tempo não pegam o mesmo job.
 */
const MAX_TENTATIVAS_CLAIM = 5;
const HEARTBEAT_TIMEOUT_MS = 60_000;
const MAX_TENTATIVAS_JOB = 3;

async function handler(req: AgentAuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const types = Array.isArray(req.body?.types)
      ? req.body.types.filter((t: unknown) => typeof t === 'string' && t.trim())
      : null;

    const where = {
      status: 'QUEUED' as const,
      ...(types?.length ? { type: { in: types } } : {}),
    };

    const agora = new Date();

    // Resgata jobs abandonados: RUNNING sem heartbeat há >60s indica agent
    // que morreu no meio. Volta para QUEUED até a 3ª tentativa; depois FAILED.
    const limiteHeartbeat = new Date(agora.getTime() - HEARTBEAT_TIMEOUT_MS);
    await automationPrisma.job.updateMany({
      where: {
        status: 'RUNNING',
        lastHeartbeatAt: { lt: limiteHeartbeat },
        attempts: { lt: MAX_TENTATIVAS_JOB },
      },
      data: { status: 'QUEUED', agentId: null, startedAt: null },
    });
    await automationPrisma.job.updateMany({
      where: {
        status: 'RUNNING',
        lastHeartbeatAt: { lt: limiteHeartbeat },
        attempts: { gte: MAX_TENTATIVAS_JOB },
      },
      data: {
        status: 'FAILED',
        errorMessage: 'timeout de heartbeat',
        finishedAt: agora,
      },
    });

    // st agora = new Date();

    // Claim atômico: se outro agent vencer a corrida, tenta o próximo candidato
    for (let tentativa = 0; tentativa < MAX_TENTATIVAS_CLAIM; tentativa++) {
      const candidato = await automationPrisma.job.findFirst({
        where,
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      if (!candidato) {
        return res.status(200).json({ success: true, job: null });
      }

      const claimed = await automationPrisma.job.updateMany({
        where: { id: candidato.id, status: 'QUEUED' },
        data: {
          status: 'RUNNING',
          agentId: req.agent.id,
          startedAt: agora,
          lastHeartbeatAt: agora,
          attempts: { increment: 1 },
        },
      });

      if (claimed.count === 0) continue; // outro agent levou; tenta o próximo

      const job = await automationPrisma.job.findUnique({
        where: { id: candidato.id },
        select: { id: true, type: true, payload: true },
      });

      return res.status(200).json({ success: true, job });
    }

    // Várias corridas perdidas seguidas — fila ainda pode ter itens, mas evita loop
    return res.status(200).json({ success: true, job: null });
  } catch (error) {
    console.error('Erro ao fazer claim de job:', error);
    return res.status(500).json({ success: false, message: 'Erro interno do servidor' });
  }
}

export default withAgentAuth(handler);
