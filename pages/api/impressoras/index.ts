import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCookies, verifyToken } from '../../../lib/auth';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://controle-carga-web.vercel.app',
  /^https:\/\/.*\.vercel\.app$/
];

// Middleware CORS
const allowCors = (fn: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin || '';
  
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

// Lista de impressoras disponíveis (em produção, viria de sistema real)
const IMPRESSORAS_DISPONIVEIS = [
  {
    name: 'Zebra ZD220',
    status: 'online',
    driver: 'ZDesigner',
    port: 'USB'
  },
  {
    name: 'Zebra ZT230',
    status: 'online',
    driver: 'ZDesigner',
    port: 'USB'
  },
  {
    name: 'Zebra GK420d',
    status: 'online',
    driver: 'ZDesigner',
    port: 'USB'
  },
  {
    name: 'Argox OS-214plus',
    status: 'offline',
    driver: 'Argox',
    port: 'LPT1'
  },
  {
    name: 'Eltron TLP2844',
    status: 'error',
    driver: 'Eltron',
    port: 'USB'
  },
  {
    name: 'Datamax O\'Neil',
    status: 'online',
    driver: 'Datamax',
    port: 'USB'
  },
  {
    name: 'SATO CL4NX',
    status: 'online',
    driver: 'SATO',
    port: 'Network'
  }
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const decoded = await verifyToken(token, process.env.JWT_SECRET || 'seu_segredo_secreto');
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    console.log('[API] Listando impressoras disponíveis');

    // Retornar lista de impressoras
    return res.status(200).json(IMPRESSORAS_DISPONIVEIS);

  } catch (error) {
    console.error('Erro ao listar impressoras:', error);
    return res.status(500).json({ 
      error: 'Erro ao listar impressoras',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export default allowCors(handler);
