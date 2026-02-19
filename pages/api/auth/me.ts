import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { parseCookies } from 'nookies';

// Lista de origens permitidas
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'https://seu-dominio.com',
  'https://www.seu-dominio.com'
];

// Configurações de CORS padrão
const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Set-Cookie, XSRF-TOKEN',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Vary': 'Origin, Cookie, Accept-Encoding',
};

// Middleware para habilitar CORS
const allowCors = (fn: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  // Obter origem da requisição
  const origin = req.headers.origin || '';
  const requestMethod = req.headers['access-control-request-method'];
  const requestHeaders = req.headers['access-control-request-headers'];
  
  // Verificar se a origem é permitida
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
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
    // Adicionar headers específicos para preflight
    if (requestMethod) {
      res.setHeader('Access-Control-Allow-Methods', requestMethod);
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
    console.error('Erro no handler de me:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

const prisma = new PrismaClient();

interface TokenPayload {
  id: string;
  email: string;
  tipo: string;
  iat: number;
  exp: number;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  // Obter a origem da requisição para uso em logs
  const origin = req.headers.origin || '';

  // Se for uma requisição OPTIONS, retornar imediatamente
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false,
      message: 'Método não permitido' 
    });
  }
  
  // Configurar headers de segurança
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  try {
    // Obter o token dos cookies
    const cookies = parseCookies({ req });
    const token = cookies.auth_token;
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Não autenticado' 
      });
    }

    // Verificar o token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_secreto') as TokenPayload;
      
      // Buscar usuário
      const user = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
          ultimoAcesso: true
        }
      });

      if (!user) {
        return res.status(404).json({ 
          success: false,
          message: 'Usuário não encontrado' 
        });
      }

      // Atualizar último acesso
      await prisma.usuario.update({
        where: { id: user.id },
        data: { ultimoAcesso: new Date() }
      });

      return res.status(200).json({ 
        success: true,
        user 
      });
      
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return res.status(401).json({ 
        success: false,
        message: 'Sessão inválida ou expirada' 
      });
    }
    
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor' 
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Configuração do tamanho máximo do corpo da requisição para esta rota
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default allowCors(handler);
