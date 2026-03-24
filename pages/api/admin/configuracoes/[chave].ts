import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { chave } = req.query;

  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!chave || Array.isArray(chave)) {
    return res.status(400).json({ message: 'Chave inválida' });
  }

  try {
    const { valor } = req.body;

    // Verifica se a configuração existe
    const config = await prisma.configuracaoSistema.findUnique({
      where: { chave }
    });

    if (!config) {
      return res.status(404).json({ message: 'Configuração não encontrada' });
    }

    // Atualiza a configuração
    const updatedConfig = await prisma.configuracaoSistema.update({
      where: { chave },
      data: { valor: String(valor) }
    });

    return res.status(200).json(updatedConfig);
  } catch (error) {
    console.error(`Erro ao atualizar configuração ${chave}:`, error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
