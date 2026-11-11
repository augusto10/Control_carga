import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { descriptografarTemplateBiometrico } from '@/lib/biometria';
import { agenteBiometriaAutorizado } from '@/lib/biometria-agent-auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método não permitido.' });
  }

  if (!process.env.BIOMETRIA_AGENT_TOKEN) {
    return res.status(500).json({ message: 'BIOMETRIA_AGENT_TOKEN não está configurado no servidor.' });
  }
  if (!agenteBiometriaAutorizado(req)) {
    return res.status(401).json({ message: 'Agente biométrico não autorizado.' });
  }

  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        ativo: true,
        codigoAdm: { not: null },
        senhaAdm: { not: '' },
        biometria: { not: null },
      },
      select: { id: true, nome: true, biometria: true },
      orderBy: { nome: 'asc' },
    });

    const candidatos = usuarios.map((usuario) => {
      if (!usuario.biometria) {
        throw new Error(`Biometria ausente para o usuário ${usuario.id}.`);
      }
      return {
        id: usuario.id,
        nome: usuario.nome,
        template: descriptografarTemplateBiometrico(usuario.biometria),
      };
    });

    return res.status(200).json({ candidatos });
  } catch (error) {
    console.error('Erro ao carregar candidatos biométricos:', error);
    return res.status(500).json({ message: 'Não foi possível carregar as digitais cadastradas.' });
  }
}
