const { PrismaClient } = require('@prisma/client');

// Inicializa o cliente do Prisma
const prisma = new PrismaClient();

// Middleware para lidar com CORS
const withCors = (handler) => async (event, context) => {
  // Configuração de CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };

  // Resposta para requisições OPTIONS (pré-voo)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Executa o manipulador da rota
    const result = await handler(event, context, prisma);
    
    // Adiciona os cabeçalhos CORS à resposta
    return {
      ...result,
      headers: {
        ...result.headers,
        ...headers,
      },
    };
  } catch (error) {
    console.error('Erro na função:', error);
    
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        message: error.message || 'Erro interno do servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      }),
    };
  }
};

// Função para verificar autenticação
const authenticate = (handler) => async (event, context, prisma) => {
  try {
    const authHeader = event.headers.authorization || '';
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw { statusCode: 401, message: 'Token não fornecido' };
    }

    // Verifica o token JWT
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    
    // Busca o usuário no banco de dados
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
      },
    });

    if (!user) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    if (!user.ativo) {
      throw { statusCode: 403, message: 'Usuário desativado' };
    }

    // Adiciona o usuário ao contexto
    context.user = user;
    
    return handler(event, context, prisma);
  } catch (error) {
    console.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      throw { statusCode: 401, message: 'Token inválido' };
    }
    
    if (error.name === 'TokenExpiredError') {
      throw { statusCode: 401, message: 'Token expirado' };
    }
    
    throw error;
  }
};

// Função para verificar permissões de administrador
const requireAdmin = (handler) => async (event, context, prisma) => {
  if (context.user.tipo !== 'ADMIN') {
    throw { statusCode: 403, message: 'Acesso negado' };
  }
  
  return handler(event, context, prisma);
};

module.exports = {
  prisma,
  withCors,
  authenticate,
  requireAdmin,
};
