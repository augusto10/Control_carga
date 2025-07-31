import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCookies, verifyToken } from '../../../lib/auth';
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

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID da nota é obrigatório' });
    }

    // Extrair e verificar token JWT
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ error: 'Token não encontrado' });
    }

    const decoded = await verifyToken(token, process.env.JWT_SECRET || 'seu_segredo_secreto');
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar permissões do usuário
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { tipo: true }
    });

    if (!user || (user.tipo !== 'ADMIN' && user.tipo !== 'GERENTE')) {
      return res.status(403).json({ error: 'Acesso negado. Apenas ADMIN ou GERENTE podem excluir notas.' });
    }

    // Verificar se a nota existe
    const nota = await prisma.notaFiscal.findUnique({
      where: { id }
    });

    if (!nota) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }

    // Excluir a nota
    await prisma.notaFiscal.delete({
      where: { id }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Nota excluída com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao excluir nota:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar exclusão da nota' 
    });
  }
}

export default allowCors(handler);
