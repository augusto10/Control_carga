import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

// Inicialização do Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

// Constantes de configuração
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';
const COOKIE_NAME = 'auth_token';
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;

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
    console.error('Erro no handler:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

const handler = async (req: LoginRequest, res: NextApiResponse) => {
  console.log('=== INÍCIO DO HANDLER DE LOGIN ===');
  try {
    console.log('1. Recebida requisição de login');
    console.log('   - Método:', req.method);
    console.log('   - Headers:', JSON.stringify(req.headers, null, 2));
    console.log('   - Corpo:', JSON.stringify(req.body, null, 2));
    
    // Verificar se o corpo da requisição está vazio
    if (!req.body) {
      console.error('Erro: Corpo da requisição vazio');
      return res.status(400).json({
        success: false,
        message: 'Corpo da requisição inválido'
      });
    }
    // Verificar método HTTP
    console.log('2. Verificando método HTTP');
    if (req.method !== 'POST') {
      console.error(`Erro: Método ${req.method} não permitido`);
      return res.status(405).json({ 
        success: false,
        message: 'Método não permitido',
        code: 'METHOD_NOT_ALLOWED'
      });
    }

    // Extrair e validar email e senha
    console.log('3. Extraindo email e senha do corpo da requisição');
    const { email: rawEmail, senha } = req.body;
    
    // Validar presença dos campos obrigatórios
    if (!rawEmail || !senha) {
      return res.status(400).json({
        success: false,
        message: 'E-mail e senha são obrigatórios',
        code: 'MISSING_FIELDS'
      });
    }
    
    // Normalizar e validar email
    console.log('4. Normalizando e validando email');
    const email = String(rawEmail).trim().toLowerCase();
    console.log('   - Email normalizado:', email);
    
    // Verificar se o email não está vazio após o trim
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'O e-mail não pode estar vazio',
        code: 'EMPTY_EMAIL'
      });
    }

    // Verificar comprimento do email
    if (email.length > MAX_EMAIL_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `O email não pode ter mais de ${MAX_EMAIL_LENGTH} caracteres`,
        code: 'EMAIL_TOO_LONG'
      });
    }
    
    // Verificar se o email tem formato válido
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de email inválido',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    // Extrair e validar domínio do email
    const domain = email.split('@')[1];
    
    // Verificar se o domínio existe
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: 'Domínio de email inválido',
        code: 'INVALID_EMAIL_DOMAIN'
      });
    }
    
    // Verificar formato básico do domínio (deve ter pelo menos um ponto)
    if (!domain.includes('.')) {
      return res.status(400).json({
        success: false,
        message: 'Domínio de email inválido',
        code: 'INVALID_EMAIL_DOMAIN'
      });
    }
    
    // Verificar domínios locais básicos
    const localDomains = ['localhost', 'local', '127.0.0.1', '::1'];
    if (localDomains.includes(domain.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Domínio de email não permitido',
        code: 'INVALID_EMAIL_DOMAIN'
      });
    }
    
    // Verificar se a senha é uma string
    if (typeof senha !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Senha inválida',
        code: 'INVALID_PASSWORD'
      });
    }
    
    // Verificar comprimento mínimo da senha
    if (senha.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
        code: 'PASSWORD_TOO_SHORT'
      });
    }
    
    // Buscar usuário no banco de dados
    console.log('5. Buscando usuário no banco de dados');
    console.log('   - Email:', email);
    
    let usuario;
    try {
      console.log('5.1. Iniciando busca no banco de dados...');
      usuario = await prisma.usuario.findUnique({
        where: { email }
      });
      
      console.log('5.2. Busca no banco concluída');
      console.log('   - Resultado da busca:', usuario ? 'Usuário encontrado' : 'Usuário não encontrado');
      if (usuario) {
        console.log('   - ID do usuário:', usuario.id);
        console.log('   - Nome do usuário:', usuario.nome);
        console.log('   - Tipo de usuário:', usuario.tipo);
        console.log('   - Usuário ativo:', usuario.ativo);
      }
    } catch (dbError) {
      console.error('5.3. Erro ao buscar usuário no banco de dados:');
      console.error(dbError);
      return res.status(500).json({
        success: false,
        message: 'Erro ao buscar usuário no banco de dados',
        code: 'DATABASE_ERROR',
        error: process.env.NODE_ENV === 'development' ? (dbError as Error).message : undefined
      });
    }
    
    // Verificar se o usuário existe
    console.log('6. Verificando se o usuário existe');
    if (!usuario) {
      console.log('   - Usuário não encontrado com o email fornecido');
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Verificar se o usuário está ativo
    console.log('7. Verificando se o usuário está ativo');
    if (!usuario.ativo) {
      console.log('   - Conta do usuário está desativada');
      return res.status(403).json({
        success: false,
        message: 'Conta desativada',
        code: 'ACCOUNT_DISABLED'
      });
    }
    
    // Verificar a senha
    console.log('8. Iniciando verificação de senha');
    let senhaValida = false;
    try {
      console.log('8.1. Comparando senha fornecida com hash no banco');
      senhaValida = await compare(senha, usuario.senha);
      console.log('8.2. Resultado da verificação de senha:', senhaValida ? 'Válida' : 'Inválida');
    } catch (compareError) {
      console.error('8.3. Erro ao comparar senhas:');
      console.error(compareError);
      return res.status(500).json({
        success: false,
        message: 'Erro ao verificar credenciais',
        code: 'AUTH_ERROR',
        error: process.env.NODE_ENV === 'development' ? (compareError as Error).message : undefined
      });
    }
    
    if (!senhaValida) {
      console.log('8.4. Senha inválida fornecida');
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Criar token JWT
    console.log('9. Gerando token JWT');
    let token;
    try {
      console.log('9.1. Dados do payload:', {
        id: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo,
        nome: usuario.nome
      });
      
      token = sign(
        { 
          id: usuario.id, 
          email: usuario.email,
          tipo: usuario.tipo,
          nome: usuario.nome
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      console.log('9.2. Token JWT gerado com sucesso');
    } catch (tokenError) {
      console.error('9.3. Erro ao gerar token JWT:');
      console.error(tokenError);
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar token de autenticação',
        code: 'TOKEN_GENERATION_ERROR',
        error: process.env.NODE_ENV === 'development' ? (tokenError as Error).message : undefined
      });
    }
    
    // Atualizar último acesso
    console.log('10. Atualizando último acesso do usuário');
    try {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { ultimoAcesso: new Date() }
      });
      console.log('10.1. Último acesso atualizado com sucesso');
    } catch (updateError) {
      // Não falhar a requisição se não conseguir atualizar o último acesso
      console.error('10.2. Erro ao atualizar último acesso (não crítico):');
      console.error(updateError);
    }
    
    // Configurar cookie HTTP-only seguro
    console.log('11. Configurando cookie de autenticação HTTP-only');
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Obter origem da requisição e determinar a origem permitida
    const origin = req.headers.origin || '';
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    
    // Log de depuração
    console.log('11.1. Origem da requisição:', origin);
    console.log('11.2. Origem permitida:', allowedOrigin);
    console.log('11.3. Ambiente de produção:', isProduction);
    
    // Determinar o domínio do cookie
    let cookieDomain = '';
    if (isProduction) {
      // Em produção, extrair o domínio da origem permitida
      try {
        const domainUrl = new URL(allowedOrigin);
        const domainParts = domainUrl.hostname.split('.');
        
        // Se tiver subdomínios (ex: app.exemplo.com), pega apenas os dois últimos níveis (.exemplo.com)
        if (domainParts.length > 2) {
          cookieDomain = `.${domainParts.slice(-2).join('.')}`;
        } else {
          cookieDomain = `.${domainUrl.hostname}`;
        }
        
        console.log('11.0. Domínio do cookie em produção:', cookieDomain);
      } catch (error) {
        console.error('Erro ao analisar domínio:', error);
        // Em caso de erro, não define o domínio
        cookieDomain = '';
      }
    }
    // Em desenvolvimento, não definimos o domínio para que o cookie seja enviado para localhost
    
    // Definir opções de cookie baseadas no ambiente
    const cookieOptions: any = {
      httpOnly: true,
      secure: isProduction, // true em produção, false em desenvolvimento
      sameSite: 'lax', // Usar 'lax' para melhor compatibilidade
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    };
    
    // Configurações específicas para produção
    if (isProduction) {
      // Em produção, sempre usar HTTPS e domínio correto
      cookieOptions.secure = true;
      cookieOptions.sameSite = 'lax';
      
      // Apenas definir o domínio se estiver configurado
      if (cookieDomain) {
        cookieOptions.domain = cookieDomain;
        console.log('11.4. Domínio do cookie definido para:', cookieDomain);
      } else {
        console.log('11.4. Nenhum domínio de cookie definido para produção!');
      }
    } else {
      // Em desenvolvimento, permitir HTTP e HTTPS
      cookieOptions.secure = origin.startsWith('https://');
      cookieOptions.sameSite = 'lax';
      
      // Não definir domínio em desenvolvimento para garantir que funcione em localhost
      delete cookieOptions.domain;
    }
    
    // Criar o cookie
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
