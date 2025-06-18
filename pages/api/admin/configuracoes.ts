import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../prisma/config';
import { PrismaClientWithConfiguracaoSistema } from '../../../prisma/config';
import { ApiError, ApiResponse } from '../../../types/api';
import jwt from 'jsonwebtoken';

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
    // Verificar se já existem configurações
    const contador = await (prisma as PrismaClientWithConfiguracaoSistema).configuracaoSistema.count();
    
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
      await (prisma as PrismaClientWithConfiguracaoSistema).configuracaoSistema.createMany({
        data: configuracoesParaCriar
      });
    }
  } catch (error) {
    console.error('Erro ao inicializar configurações:', error);
    throw new Error('Erro ao inicializar configurações do sistema');
  }
}

// Função para listar configurações
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação e permissão
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({
      message: 'Token não fornecido'
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      message: 'Token inválido'
    });
  }

  try {
    // Verificar o token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_secreto') as TokenPayload;
    
    // Verificar se o usuário é administrador
    if (decoded.tipo !== 'ADMIN') {
      return res.status(403).json({
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

    switch (req.method) {
      case 'GET':
        const configuracoes = await (prisma as PrismaClientWithConfiguracaoSistema).configuracaoSistema.findMany({
          orderBy: { chave: 'asc' }
        });
        return res.status(200).json(configuracoes);

      case 'PUT':
        const { id, valor } = req.body;
        if (!id || !valor) {
          return res.status(400).json({
            message: 'ID e valor são obrigatórios'
          });
        }

        const configuracao = await (prisma as PrismaClientWithConfiguracaoSistema).configuracaoSistema.update({
          where: { id },
          data: { valor }
        });

        return res.status(200).json(configuracao);

      default:
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({
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
