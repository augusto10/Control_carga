import { createHash, randomBytes } from 'crypto';
import type { NextApiResponse } from 'next';
import automationPrisma from '@/lib/automation-prisma';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

const ADMIN_ROLES = new Set(['ADMIN', 'GERENTE']);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!ADMIN_ROLES.has(req.user.tipo)) {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }

  if (req.method === 'GET') {
    try {
      const agents = await automationPrisma.agent.findMany({
        select: {
          id: true,
          agentCode: true,
          name: true,
          isEnabled: true,
          lastHeartbeatAt: true,
          createdAt: true,
          _count: { select: { jobs: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json(agents);
    } catch (error) {
      console.error('Erro ao listar agents de automação:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { agentCode, name } = req.body ?? {};

      if (!agentCode || typeof agentCode !== 'string' || !agentCode.trim()) {
        return res.status(400).json({ message: 'agentCode é obrigatório' });
      }
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'name é obrigatório' });
      }

      const existing = await automationPrisma.agent.findUnique({
        where: { agentCode: agentCode.trim() },
        select: { id: true },
      });
      if (existing) {
        return res.status(409).json({ message: 'Já existe um agent com esse agentCode' });
      }

      // Token em claro é exibido UMA única vez ao admin; só o hash vai para o banco
      const token = randomBytes(32).toString('base64url');
      const tokenHash = createHash('sha256').update(token).digest('hex');

      const agent = await automationPrisma.agent.create({
        data: {
          agentCode: agentCode.trim(),
          name: name.trim(),
          tokenHash,
        },
        select: {
          id: true,
          agentCode: true,
          name: true,
          isEnabled: true,
          createdAt: true,
        },
      });

      return res.status(201).json({ ...agent, token });
    } catch (error) {
      console.error('Erro ao criar agent de automação:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Método não permitido' });
}

export default withAuth(handler);
