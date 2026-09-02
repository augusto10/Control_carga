import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const configs = await prisma.configuracaoSistema.findMany({
        where: {
          editavel: true,
        },
        select: {
          id: true,
          chave: true,
          valor: true,
          descricao: true,
          tipo: true,
          opcoes: true,
          editavel: true,
        },
        orderBy: {
          chave: 'asc',
        },
      });
      return res.status(200).json({ data: configs });
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      return res.status(500).json({ message: 'Erro ao buscar configurações' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { configuracoes } = req.body;
      
      if (!Array.isArray(configuracoes)) {
         return res.status(400).json({ message: 'Formato inválido. Esperado array de configurações.' });
      }

      // Transaction to update all configs
      await prisma.$transaction(
        configuracoes.map((config: any) => 
          prisma.configuracaoSistema.update({
            where: { id: config.id },
            data: { valor: String(config.valor) },
          })
        )
      );

      return res.status(200).json({ message: 'Configurações atualizadas com sucesso' });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      return res.status(500).json({ message: 'Erro ao salvar configurações' });
    }
  } else if (req.method === 'POST') {
    // Keep POST for single creation if needed, though frontend uses PUT
    try {
      const { chave, valor } = req.body;
      
      if (!chave || valor === undefined) {
         return res.status(400).json({ message: 'Chave e valor são obrigatórios' });
      }

      const config = await prisma.configuracaoSistema.upsert({
        where: { chave },
        update: { valor: String(valor) },
        create: { chave, valor: String(valor) },
      });

      return res.status(200).json(config);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      return res.status(500).json({ message: 'Erro ao salvar configuração' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
