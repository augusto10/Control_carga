import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const { codigo, numeroNota, valor } = req.body;
      
      if (!codigo || !numeroNota) {
        throw new Error('Campos obrigatórios ausentes');
      }
      const numericValor = typeof valor === 'number' ? valor : parseFloat(valor) || 0;

      const newNota = await prisma.notaFiscal.create({
        data: {
          codigo,
          numeroNota,
          valor: numericValor,
          controleId: null
        }
      });

      res.status(200).json(newNota);
    } catch (error: any) {
      res.status(500).json({ error: { message: error.message, statusCode: 500 } });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
