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
const getTokenFromCookies = (req: NextApiRequest): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {} as Record<string, string>);

  return cookies.jwt || null;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID do motorista é obrigatório' });
    }

    // Extrair e verificar token JWT
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ error: 'Token não encontrado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verificar permissões
    if (!['ADMIN', 'GERENTE'].includes(decoded.tipo)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }

    // Verificar se o motorista existe
    const motorista = await prisma.motorista.findUnique({
      where: { id }
    });

    if (!motorista) {
      return res.status(404).json({ error: 'Motorista não encontrado' });
    }

    // Verificar se há controles vinculados
    const controlesVinculados = await prisma.controleCarga.count({
      where: { motorista: id }
    });

    if (controlesVinculados > 0) {
      return res.status(409).json({ 
        error: 'Não é possível excluir motorista com controles vinculados',
        details: `Existem ${controlesVinculados} controles vinculados a este motorista`
      });
    }

    // Excluir o motorista
    await prisma.motorista.delete({
      where: { id }
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Motorista excluído com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao excluir motorista:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    return res.status(500).json({ 
      error: 'Erro ao excluir motorista',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export default allowCors(handler);
