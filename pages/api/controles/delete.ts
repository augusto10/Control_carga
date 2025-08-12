import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://controle-carga-web.vercel.app',
  /^https:\/\/.*\.vercel\.app$/
];

// Middleware CORS otimizado
const allowCors = (fn: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin || '';
  
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return await fn(req, res);
  } catch (error) {
    console.error('Erro no handler:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Função para extrair token dos cookies
import { getTokenFromCookies, verifyToken } from '../../../lib/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID do controle é obrigatório' });
    }

    // Extrair e verificar token JWT
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ error: 'Token não encontrado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verificar permissões básicas
    if (!['ADMIN', 'GERENTE'].includes(decoded.tipo)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    // Verificar se o controle existe
    const controle = await prisma.controleCarga.findUnique({
      where: { id },
      include: { notas: true }
    });

    if (!controle) {
      return res.status(404).json({ error: 'Controle não encontrado' });
    }

    // Se o controle estiver finalizado, apenas ADMIN pode excluir
    if (controle.finalizado && decoded.tipo !== 'ADMIN') {
      return res.status(403).json({ error: 'Apenas ADMIN pode excluir controle finalizado' });
    }

    // Desvincular notas antes de excluir
    if (controle.notas && controle.notas.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Atualizar notas para desvincular do controle
        await tx.notaFiscal.updateMany({
          where: { controleId: id },
          data: { controleId: null }
        });
        
        // Excluir o controle
        await tx.controleCarga.delete({
          where: { id }
        });
      });
    } else {
      // Se não tem notas, excluir diretamente
      await prisma.controleCarga.delete({
        where: { id }
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Controle excluído com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao excluir controle:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    return res.status(500).json({ 
      error: 'Erro ao excluir controle',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export default allowCors(handler);
