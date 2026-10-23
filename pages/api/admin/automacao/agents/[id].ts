import type { NextApiResponse } from 'next';
import automationPrisma from '@/lib/automation-prisma';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

const ADMIN_ROLES = new Set(['ADMIN', 'GERENTE']);

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!ADMIN_ROLES.has(req.user.tipo)) {
    return res.status(403).json({ message: 'Acesso restrito a administradores' });
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) {
    return res.status(400).json({ message: 'id é obrigatório' });
  }

  try {
    const { isEnabled, name } = req.body ?? {};

    const data: { isEnabled?: boolean; name?: string } = {};
    if (typeof isEnabled === 'boolean') data.isEnabled = isEnabled;
    if (typeof name === 'string' && name.trim()) data.name = name.trim();

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar' });
    }

    const agent = await automationPrisma.agent.update({
      where: { id },
      data,
      select: {
        id: true,
        agentCode: true,
        name: true,
        isEnabled: true,
        lastHeartbeatAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json(agent);
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'P2025') {
      return res.status(404).json({ message: 'Agent não encontrado' });
    }
    console.error('Erro ao atualizar agent de automação:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

export default withAuth(handler);
