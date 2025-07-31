import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { Transportadora } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

// Constantes de configuração
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

// Lista de origens permitidas
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://seu-dominio.com',
  'https://www.seu-dominio.com',
  'https://controle-logistica.vercel.app',
  /^https:\/\/controle-logistica-.*-augusto10s-projects\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app$/ // Permite qualquer subdomínio do Vercel para ambiente de desenvolvimento
];

// Configurações de CORS padrão
const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Set-Cookie, XSRF-TOKEN',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Vary': 'Origin, Cookie, Accept-Encoding',
};

// Função para verificar se uma origem é permitida
function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.some(allowed => {
    if (typeof allowed === 'string') {
      return allowed === origin;
    }
    return allowed.test(origin);
  });
}

// Middleware para habilitar CORS
const allowCors = (fn: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  // Obter origem da requisição
  const origin = req.headers.origin || '';
  const requestMethod = req.headers['access-control-request-method'];
  const requestHeaders = req.headers['access-control-request-headers'];
  
  // Verificar se a origem está na lista de permitidas
  const originIsAllowed = isOriginAllowed(origin);
  const allowedOrigin = originIsAllowed ? origin : (typeof ALLOWED_ORIGINS[0] === 'string' ? ALLOWED_ORIGINS[0] : '');
  
  // Aplicar headers CORS padrão
  Object.entries(DEFAULT_CORS_HEADERS).forEach(([key, value]) => {
    if (key.toLowerCase() === 'access-control-allow-origin') {
      res.setHeader(key, allowedOrigin);
    } else {
      res.setHeader(key, value);
    }
  });
  
  // Configurar headers específicos para a origem permitida
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  
  // Se for uma requisição OPTIONS (preflight), retornar imediatamente
  if (req.method === 'OPTIONS') {
    // Adicionar headers específicos para preflight - garantir DELETE
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, POST, OPTIONS');
    if (requestMethod) {
      res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, POST, OPTIONS');
    }
    
    if (requestHeaders) {
      res.setHeader('Access-Control-Allow-Headers', requestHeaders);
    }
    
    return res.status(204).end();
  }

  // Chamar o handler principal
  try {
    return await fn(req, res);
  } catch (error) {
    console.error('Erro no handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'ID é obrigatório' });

  switch (req.method) {
    case 'GET':
      return obter(id, res);
    case 'PUT':
      return atualizar(id, req, res);
    case 'DELETE':
      return remover(id, req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}

async function obter(id: string, res: NextApiResponse) {
  try {
    const motoristaDb = await prisma.motorista.findUnique({
      where: { id },
    });
    if (!motoristaDb) return res.status(404).json({ error: 'Motorista não encontrado' });
    const motorista = {
      ...motoristaDb,
      transportadora: {
        id: motoristaDb.transportadoraId,
        descricao: motoristaDb.transportadoraId === 'ACERT' 
          ? 'ACCERT Transportes' 
          : motoristaDb.transportadoraId === 'TERCEIRIZADA' 
            ? 'Terceirizada' 
            : 'Expresso Goiás',
      },
    };
    if (!motorista) return res.status(404).json({ error: 'Motorista não encontrado' });
    return res.status(200).json(motorista);
  } catch (error) {
    console.error('Erro ao obter motorista:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function atualizar(id: string, req: NextApiRequest, res: NextApiResponse) {
  const { nome, telefone, cpf, cnh, transportadoraId } = req.body as {
    nome?: string;
    telefone?: string;
    cpf?: string;
    cnh?: string;
    transportadoraId?: Transportadora;
  };

  try {
    const motorista = await prisma.motorista.update({
      where: { id },
      data: { nome, telefone, cpf, cnh, transportadoraId: transportadoraId as Transportadora },
    });
    return res.status(200).json(motorista);
  } catch (error) {
    console.error('Erro ao atualizar motorista:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function remover(id: string, req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar autenticação usando função utilitária
    console.log('[Auth] Extraindo token dos cookies usando função utilitária');
    const token = getTokenFromCookies(req);
    console.log('[Auth] Token de autenticação:', !!token);
    
    if (!token) {
      console.log('[Auth] Token não encontrado nos cookies');
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Verificar o token JWT usando função utilitária
    console.log('[Auth] Verificando token com função utilitária');
    const decoded = await verifyToken(token, JWT_SECRET);
    console.log('[Auth] Token decodificado:', decoded ? '***SUCCESS***' : '***FAILED***');
    
    if (!decoded || !decoded.id) {
      console.log('[Auth] Token inválido ou sem ID de usuário');
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar se o usuário tem permissão
    console.log('Verificando permissões do usuário:', decoded.id);
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { tipo: true }
    });
    
    console.log('Tipo de usuário:', usuario?.tipo);

    const isAdmin = usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GERENTE';
    console.log('Usuário é admin/gerente:', isAdmin);
    
    // Apenas admins e gerentes podem excluir motoristas
    if (!isAdmin) {
      console.log('Usuário sem permissão para excluir motorista');
      return res.status(403).json({ error: 'Sem permissão para excluir motorista' });
    }

    await prisma.motorista.delete({ where: { id } });
    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir motorista:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
