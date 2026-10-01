import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { codigo, numeroNota, volumes, usuarioId } = req.body;

    if (!codigo || !numeroNota) {
      return res.status(400).json({ message: 'Código e Número da Nota são obrigatórios' });
    }

    const nota = await prisma.notaFiscal.create({
      data: {
        codigo,
        numeroNota,
        volumes: String(volumes || '1'),
        usuarioId: usuarioId || undefined,
      },
    });

    return res.status(201).json(nota);
  } catch (error) {
    console.error('Erro ao adicionar nota:', error);
    return res.status(500).json({ message: 'Erro ao adicionar nota' });
  }
}
