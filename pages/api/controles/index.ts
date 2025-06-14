import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': {
      try {
        const controles = await prisma.controleCarga.findMany({
          orderBy: { dataCriacao: 'desc' },
          include: {
            notas: true,
          },
        });
        res.status(200).json(controles);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar controles' });
      }
      break;
    }
    case 'POST': {
      try {
        const { motorista, responsavel } = req.body;

        // Gerar próximo número de manifesto sequencial (maior valor + 1)
        const allManifestos = await prisma.controleCarga.findMany({
          select: { numeroManifesto: true },
        });
        const maxNum = allManifestos.reduce((max, c) => {
          const n = parseInt(c.numeroManifesto, 10);
          return (!isNaN(n) && n > max) ? n : max;
        }, 0);
        const numeroManifesto = (maxNum + 1).toString();

        const placeholderData = {
          cpfMotorista: '00000000000',
          transportadora: 'ACERT',
          numeroManifesto,
          qtdPallets: 0,
          observacao: '',
        };

        if (!motorista || !responsavel) {
          return res.status(400).json({ error: 'Motorista e responsável são obrigatórios.' });
        }
        const controle = await prisma.controleCarga.create({
          data: {
            motorista,
            responsavel,
            ...placeholderData,
            finalizado: false,
          } as any,
        });
        res.status(200).json(controle);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar controle' });
      }
      break;
    }
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
