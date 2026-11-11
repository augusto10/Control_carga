import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import automationPrisma from '@/lib/automation-prisma';
import { calcularFilaSeparacao } from '@/lib/separacao-fila';
import { validarTokenAgenteBiometria } from '@/lib/biometria-agent-auth';

const JOB_TYPE = 'IMPRIMIR_LISTA_SEPARACAO';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  if (!process.env.BIOMETRIA_AGENT_TOKEN) {
    return res.status(500).json({ success: false, message: 'BIOMETRIA_AGENT_TOKEN não está configurado no servidor.' });
  }
  if (!validarTokenAgenteBiometria(req.headers.authorization)) {
    return res.status(401).json({ success: false, message: 'Agente biométrico não autorizado.' });
  }

  const usuarioId = typeof req.body?.usuarioId === 'string' ? req.body.usuarioId : '';
  if (!usuarioId) {
    return res.status(400).json({ success: false, message: 'Usuário identificado não informado.' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { id: true, ativo: true, codigoAdm: true, senhaAdm: true, biometria: true },
    });

    if (!usuario || !usuario.ativo || !usuario.biometria || usuario.codigoAdm === null || !usuario.senhaAdm) {
      return res.status(401).json({ success: false, message: 'Separador inativo ou sem cadastro ADM e biométrico completo.' });
    }

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;
    if (!username || !password) {
      return res.status(500).json({ success: false, message: 'Credenciais da API externa não configuradas.' });
    }

    const fila = await calcularFilaSeparacao({ username, password });
    const proximo = fila[0];
    if (!proximo) {
      return res.status(404).json({ success: false, message: 'Não há pedidos aguardando separação.' });
    }

    const job = await automationPrisma.job.create({
      data: {
        type: JOB_TYPE,
        payload: {
          pedidoId: proximo.pedidoId,
          admCodigoSeparador: usuario.codigoAdm,
          admSenhaSeparador: usuario.senhaAdm,
        },
      },
      select: { id: true, type: true, status: true },
    });

    return res.status(201).json({
      success: true,
      job: { id: job.id, type: job.type, status: job.status },
      pedido: proximo,
    });
  } catch (error: unknown) {
    console.error('Erro ao associar pedido por biometria:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({ success: false, message });
  }
}
