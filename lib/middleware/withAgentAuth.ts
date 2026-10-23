import { createHash } from 'crypto';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import automationPrisma from '@/lib/automation-prisma';

/**
 * Autenticação de AGENTS (automacao) via Bearer token.
 *
 * O agent recebe o token em claro uma única vez no cadastro
 * (`POST /api/admin/automacao/agents`); no banco fica apenas o SHA-256.
 *
 * Uso: `Authorization: Bearer <token>`
 *
 * Além de autenticar, cada chamada bem-sucedida já conta como heartbeat
 * do agent (`Agent.lastHeartbeatAt`).
 */
export interface AgentAuthenticatedRequest extends NextApiRequest {
  agent: {
    id: string;
    agentCode: string;
    name: string;
  };
}

type AgentHandler = (
  req: AgentAuthenticatedRequest,
  res: NextApiResponse
) => unknown | Promise<unknown>;

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const withAgentAuth = (handler: AgentHandler): NextApiHandler => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const header = req.headers.authorization;
    const token =
      typeof header === 'string' && header.startsWith('Bearer ')
        ? header.slice('Bearer '.length).trim()
        : null;

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Token do agent não fornecido.' });
    }

    try {
      const agent = await automationPrisma.agent.findUnique({
        where: { tokenHash: hashToken(token) },
        select: { id: true, agentCode: true, name: true, isEnabled: true },
      });

      if (!agent) {
        return res
          .status(401)
          .json({ success: false, message: 'Token do agent inválido.' });
      }

      if (!agent.isEnabled) {
        return res
          .status(403)
          .json({ success: false, message: 'Agent desabilitado.' });
      }

      // Heartbeat implícito: qualquer chamada autenticada marca o agent vivo
      await automationPrisma.agent.update({
        where: { id: agent.id },
        data: { lastHeartbeatAt: new Date() },
      });

      (req as AgentAuthenticatedRequest).agent = {
        id: agent.id,
        agentCode: agent.agentCode,
        name: agent.name,
      };

      return await handler(req as AgentAuthenticatedRequest, res);
    } catch (error) {
      console.error('Erro na autenticação do agent:', error);
      return res
        .status(500)
        .json({ success: false, message: 'Erro interno do servidor' });
    }
  };
};
