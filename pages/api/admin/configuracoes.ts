import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../prisma/config';
import { PrismaClientWithConfiguracaoSistema } from '../../../prisma/config';
import { ApiError, ApiResponse } from '../../../types/api';
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
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
    console.error('Erro no handler de configurações:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};

interface TokenPayload {
  id: string;
  email: string;
  tipo: string;
  iat: number;
  exp: number;
}

// Tipos permitidos para as configurações
type TipoConfiguracao = 'string' | 'number' | 'boolean' | 'json';

interface ConfiguracaoPadrao {
  chave: string;
  valor: string;
  descricao: string;
  tipo: TipoConfiguracao;
  editavel: boolean;
  opcoes?: string;
}

// Configurações padrão do sistema
const CONFIGURACOES_PADRAO: ConfiguracaoPadrao[] = [
  {
    chave: 'SISTEMA_NOME',
    valor: 'Sistema de Controle de Carga',
    descricao: 'Nome do sistema exibido no cabeçalho e no título da página',
    tipo: 'string',
    editavel: true
  },
  {
    chave: 'SISTEMA_MODO_MANUTENCAO',
    valor: 'false',
    descricao: 'Ativa o modo de manutenção, permitindo acesso apenas a administradores',
    tipo: 'boolean',
    editavel: true
  },
  {
    chave: 'SISTEMA_LOGO_URL',
    valor: '/logo.png',
    descricao: 'URL do logotipo do sistema',
    tipo: 'string',
    editavel: true
  },
  {
    chave: 'SISTEMA_TEMA',
    valor: 'claro',
    descricao: 'Tema de cores do sistema',
    tipo: 'string',
    opcoes: 'claro, escuro',
    editavel: true
  },
  {
    chave: 'SISTEMA_ITENS_POR_PAGINA',
    valor: '10',
    descricao: 'Número de itens por página nas listagens',
    tipo: 'number',
    editavel: true
  },
  {
    chave: 'EMAIL_SMTP_HOST',
    valor: 'smtp.exemplo.com',
    descricao: 'Servidor SMTP para envio de e-mails',
    tipo: 'string',
    editavel: true
  },
  {
    chave: 'EMAIL_SMTP_PORTA',
    valor: '587',
    descricao: 'Porta do servidor SMTP',
    tipo: 'number',
    editavel: true
  },
  {
    chave: 'EMAIL_SMTP_SEGURO',
    valor: 'true',
    descricao: 'Usar conexão segura (TLS/SSL)',
    tipo: 'boolean',
    editavel: true
  },
  {
    chave: 'EMAIL_REMETENTE',
    valor: 'nao-responder@exemplo.com',
    descricao: 'E-mail remetente para envio de notificações',
    tipo: 'string',
    editavel: true
  },
  {
    chave: 'SISTEMA_CONFIGURADO',
    valor: 'false',
    descricao: 'Indica se o sistema foi configurado pela primeira vez',
    tipo: 'boolean',
    editavel: false
  }
];

// Função para inicializar configurações padrão
async function inicializarConfiguracoesPadrao() {
  try {
    // Criar uma instância tipada do Prisma Client
    const prismaClient = prisma as unknown as PrismaClientWithConfiguracaoSistema;
    
    // Verificar se já existem configurações
    const contador = await prismaClient.configuracaoSistema.count();
    
    if (contador === 0) {
      // Mapear as configurações para o formato esperado pelo Prisma
      const configuracoesParaCriar = CONFIGURACOES_PADRAO.map(config => ({
        chave: config.chave,
        valor: config.valor,
        descricao: config.descricao,
        tipo: config.tipo,
        opcoes: config.opcoes || null,
        editavel: config.editavel
      }));

      // Criar configurações padrão usando createMany
      await prismaClient.configuracaoSistema.createMany({
        data: configuracoesParaCriar
      });
    }
  } catch (error) {
    console.error('Erro ao inicializar configurações:', error);
    throw new Error('Erro ao inicializar configurações do sistema');
  }
}

// Função para listar configurações
async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Obter a origem da requisição para uso em logs
  const origin = req.headers.origin || '';
  
  // Verificar autenticação e permissão
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Não autenticado'
    });
  }

  try {
    // Verificar o token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_secreto') as TokenPayload;
    
    // Verificar se o usuário é administrador
    if (decoded.tipo !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Permissão de administrador necessária.'
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: 'Token inválido ou expirado'
    });
  }

  try {
    // Inicializar configurações padrão se necessário
    await inicializarConfiguracoesPadrao();

    // Criar uma instância tipada do Prisma Client
    const prismaClient = prisma as unknown as PrismaClientWithConfiguracaoSistema;

    switch (req.method) {
      case 'GET':
        const configuracoes = await prismaClient.configuracaoSistema.findMany({
          orderBy: { chave: 'asc' }
        });
        return res.status(200).json({
          success: true,
          data: configuracoes
        });

      case 'PUT':
        const { id, valor } = req.body;
        if (!id || !valor) {
          return res.status(400).json({
            success: false,
            message: 'ID e valor são obrigatórios'
          });
        }

        const configuracao = await prismaClient.configuracaoSistema.update({
          where: { id },
          data: { valor }
        });

        return res.status(200).json({
          success: true,
          data: configuracao
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({
          success: false,
          message: `Método ${req.method} não permitido`
        });
    }
  } catch (error) {
    console.error('Erro na API de configurações:', error);
    const apiError: ApiError = {
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
    return res.status(500).json({
      success: false,
      error: apiError
    });
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
