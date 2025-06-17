import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AddNotaRequest {
  codigo: string;
  numeroNota: string;
  valor: number | string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const session = await getSession({ req });
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  if (req.method === 'POST') {
    try {
      const { codigo, numeroNota, valor } = req.body as Partial<AddNotaRequest>;
      
      // Validação dos campos obrigatórios
      if (!codigo?.trim()) {
        return res.status(400).json({ error: 'Código é obrigatório' });
      }
      if (!numeroNota?.trim()) {
        return res.status(400).json({ error: 'Número da nota é obrigatório' });
      }

      // Converter valor para número
      const numericValor = typeof valor === 'number' ? valor : 
                         valor ? parseFloat(valor as string) || 0 : 0;

      // Verificar se a nota já existe
      const notaExistente = await prisma.notaFiscal.findFirst({
        where: {
          OR: [
            { codigo: codigo.trim() },
            { numeroNota: numeroNota.trim() }
          ]
        }
      });

      if (notaExistente) {
        return res.status(400).json({ 
          error: 'Já existe uma nota com este código ou número',
          existingNote: {
            id: notaExistente.id,
            codigo: notaExistente.codigo,
            numeroNota: notaExistente.numeroNota
          }
        });
      }

      const newNota = await prisma.notaFiscal.create({
        data: {
          codigo: codigo.trim(),
          numeroNota: numeroNota.trim(),
          valor: numericValor,
          controleId: null
        },
        select: {
          id: true,
          codigo: true,
          numeroNota: true,
          valor: true,
          dataCriacao: true
        }
      });

      return res.status(201).json(newNota);
    } catch (error: any) {
      console.error('Erro ao adicionar nota:', error);
      
      if (error.code === 'P2002') { // Erro de violação de chave única
        return res.status(400).json({ 
          error: 'Já existe uma nota com este código ou número',
          code: 'DUPLICATE_ENTRY'
        });
      }
      
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}
