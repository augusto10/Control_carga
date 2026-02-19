import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();

interface AddNotaRequest {
  codigo: string;
  numeroNota: string;
  volumes: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  try {
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_secreto');
    
    // Verificar se o usuário existe e está ativo
    const usuario = await prisma.usuario.findUnique({
      where: { id: (decoded as any).id },
      select: { id: true, ativo: true }
    });
    
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ error: 'Usuário não autorizado' });
    }
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(401).json({ error: 'Sessão inválida ou expirada' });
  }

  if (req.method === 'POST') {
    try {
      const { codigo, numeroNota, volumes } = req.body as Partial<AddNotaRequest>;
      
      // Validação dos campos obrigatórios
      if (!codigo?.trim()) {
        return res.status(400).json({ error: 'Código é obrigatório' });
      }
      if (!numeroNota?.trim()) {
        return res.status(400).json({ error: 'Número da nota é obrigatório' });
      }

      // Validar volumes
      if (!volumes?.trim()) {
        return res.status(400).json({ error: 'Quantidade de volumes é obrigatória' });
      }

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
          volumes: volumes.trim(),
          controleId: null
        },
        select: {
          id: true,
          codigo: true,
          numeroNota: true,
          volumes: true,
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
