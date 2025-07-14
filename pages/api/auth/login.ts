import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';
import prisma from '../../../lib/prisma';

// Constantes de configuração
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';
const COOKIE_NAME = 'auth_token';
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;

// Tipos para origens permitidas
type AllowedOrigin = string | RegExp;

// Lista de origens permitidas
const ALLOWED_ORIGINS: AllowedOrigin[] = [
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

// Função para verificar se uma origem é permitida
function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.some(allowed => {
    if (typeof allowed === 'string') {
      return allowed === origin;
    }
    return allowed.test(origin);
  });
}

// Configurações de CORS padrão
const DEFAULT_CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Set-Cookie, XSRF-TOKEN',
  'Access-Control-Max-Age': '86400', // 24 hours
  'Vary': 'Origin, Cookie, Accept-Encoding',
};

// Expressão regular para validação de email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tipos
interface LoginRequest extends NextApiRequest {
  body: {
    email: string;
    senha: string;
  };
}

interface Usuario {
  id: string;
  email: string;
  senha: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  dataCriacao: Date;
  ultimoAcesso: Date;
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
    console.error('Erro no handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

const handler = async (req: LoginRequest, res: NextApiResponse) => {
  // Log para depuração
  console.log('=== INÍCIO DO HANDLER DE LOGIN ===');
  console.log('Database URL:', process.env.DATABASE_URL ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('=== INÍCIO DO HANDLER DE LOGIN ===');
  try {
    console.log('1. Recebida requisição de login');
    
    // Verificar método da requisição
    if (req.method !== 'POST') {
      console.log('2. Método não permitido:', req.method);
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      return res.status(405).json({ 
        success: false, 
        message: `Método ${req.method} não permitido`,
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // Obter origem para depuração
    const origin = req.headers.origin || 'Origem não especificada';
    console.log('3. Origem da requisição:', origin);

    // Validar corpo da requisição
    const { email, senha } = req.body;
    console.log('4. Corpo da requisição recebido:', { email: email, senha: '***' });

    if (!email || !senha) {
      console.log('5. Erro: Email ou senha ausentes');
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Validação de formato e comprimento
    if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH || !emailRegex.test(email)) {
      console.log('5. Erro: Formato de email inválido');
      return res.status(400).json({ 
        success: false, 
        message: 'Formato de email inválido',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    if (typeof senha !== 'string' || senha.length < MIN_PASSWORD_LENGTH) {
      console.log('5. Erro: Senha muito curta');
      return res.status(400).json({ 
        success: false, 
        message: `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
        code: 'PASSWORD_TOO_SHORT'
      });
    }

    // Buscar usuário no banco de dados
    console.log('6. Buscando usuário no banco de dados:', email);
    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    }) as Usuario | null;

    if (!usuario) {
      console.log('7. Erro: Usuário não encontrado');
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      console.log('7. Erro: Usuário inativo');
      return res.status(403).json({ 
        success: false, 
        message: 'Este usuário está inativo e não pode fazer login',
        code: 'USER_INACTIVE'
      });
    }

    // Comparar senha
    console.log('8. Comparando senha');
    const senhaValida = await compare(senha, usuario.senha);

    if (!senhaValida) {
      console.log('9. Erro: Senha inválida');
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Atualizar último acesso
    console.log('10. Atualizando último acesso do usuário');
    try {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { ultimoAcesso: new Date() },
      });
    } catch (updateError) {
      console.error('Erro ao atualizar último acesso:', updateError);
      // Não impede o login, mas registra o erro
    }

    // Gerar token JWT
    console.log('11. Gerando token JWT');
    const tokenPayload = {
      id: usuario.id.toString(),
      email: usuario.email,
      nome: usuario.nome,
      tipo: usuario.tipo,
    };
    
    const token = sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' }) as string;
    console.log('11.1. Token gerado com sucesso');

    // Configurar cookie
    console.log('12. Configurando o cookie de autenticação');
    
    // Lógica de cookie simplificada para robustez em dev e prod
    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // 'lax' oferece um bom equilíbrio entre segurança e usabilidade
      maxAge: 60 * 60 * 24 * 7, // 7 dias de validade
      path: '/',
      // O domínio não é definido explicitamente, permitindo que o navegador
      // o gerencie. Isso evita problemas comuns em localhost e funciona bem em produção.
    };

    // Criar o cookie com as opções simplificadas
    const cookie = serialize(COOKIE_NAME, token, cookieOptions);
    
    // Preparar resposta de sucesso
    console.log('13. Preparando resposta de sucesso');
    const responseData = {
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        dataCriacao: usuario.dataCriacao,
        ultimoAcesso: usuario.ultimoAcesso
      }
    };
    
    console.log('13.1. Dados da resposta:', JSON.stringify({
      ...responseData,
      token: '***TOKEN_REDACTED***' // Não logar o token real
    }, null, 2));
    
    // Configurar a resposta final
    console.log('13.2. Preparando resposta final');
    
    // Log detalhado para depuração
    console.log('13.3. Configuração do cookie:', {
      name: COOKIE_NAME,
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      domain: cookieOptions.domain || '(não definido)',
      path: cookieOptions.path,
      maxAge: cookieOptions.maxAge
    });
    
    // Definir o cookie na resposta
    res.setHeader('Set-Cookie', cookie);
    
    // Retornar resposta de sucesso
    console.log('13.4. Enviando resposta com status 200');
    return res.status(200).json(responseData);
      
  } catch (error: unknown) {
    console.error('=== ERRO NÃO TRATADO NO HANDLER ===');
    
    // Tratamento seguro do erro desconhecido
    if (error instanceof Error) {
      console.error('Tipo do erro:', error.constructor.name);
      console.error('Mensagem de erro:', error.message);
      console.error('Stack trace:', error.stack || 'Sem stack trace');
    } else {
      console.error('Erro desconhecido:', error);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  } finally {
    console.log('=== FIM DO HANDLER DE LOGIN ===\n');
  }
};

// Configuração do tamanho máximo do corpo da requisição para esta rota
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default allowCors(handler);
