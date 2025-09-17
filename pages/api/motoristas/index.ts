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
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return listar(req, res);
    case 'POST':
      return criar(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}

async function listar(req: NextApiRequest, res: NextApiResponse) {
  try {
    const motoristasDb = await prisma.motorista.findMany({
      orderBy: { nome: 'asc' },
    });

    // Mapeamento das transportadoras
    const transportadorasMap: Record<string, string> = {
      'ACERT': 'ACCERT Transportes',
      'EXPRESSO_GOIAS': 'Expresso Goiás',
      'TERCEIRIZADA': 'Terceirizada',
      'DETAFRA_TRANSPORTES': 'Detafra Transportes',
      'RETIRA_VENDEDOR': 'Retira Vendedor'
    };

    // Adiciona um objeto de descrição da transportadora para compatibilidade com o front-end
    const motoristas = motoristasDb.map((m: typeof motoristasDb[number]) => {
      let transportadoraId = m.transportadoraId;
      let nome = m.nome;
      
      // LÓGICA TEMPORÁRIA: Identificar motoristas "RETIRA_VENDEDOR" pelo marcador [RV] no nome
      if (m.nome.includes('[RV]')) {
        transportadoraId = 'RETIRA_VENDEDOR' as any;
        nome = m.nome.replace(' [RV]', ''); // Remover o marcador do nome
      }
      
      return {
        ...m,
        nome,
        transportadoraId,
        transportadora: {
          id: transportadoraId,
          descricao: transportadorasMap[transportadoraId] || transportadoraId,
        },
      };
    });

    return res.status(200).json(motoristas);
  } catch (error) {
    console.error('Erro ao listar motoristas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function criar(req: NextApiRequest, res: NextApiResponse) {
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
  
  // Apenas admins e gerentes podem criar motoristas
  if (!isAdmin) {
    console.log('Usuário sem permissão para criar motorista');
    return res.status(403).json({ error: 'Sem permissão para criar motorista' });
  }

  const { nome, telefone, cpf, cnh, transportadoraId } = req.body as {
    nome?: string;
    telefone?: string;
    cpf?: string;
    cnh?: string;
    transportadoraId?: Transportadora;
  };

  console.log('[Motorista] Dados recebidos:', { nome, telefone, cpf, cnh, transportadoraId });
  console.log('[Motorista] Tipo da transportadoraId:', typeof transportadoraId);

  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  if (!telefone?.trim()) return res.status(400).json({ error: 'Telefone é obrigatório' });
  if (!cpf?.trim()) return res.status(400).json({ error: 'CPF é obrigatório' });
  if (!cnh?.trim()) return res.status(400).json({ error: 'CNH é obrigatório' });
  if (!transportadoraId?.trim())
    return res.status(400).json({ error: 'Transportadora é obrigatória' });

  // Validar se a transportadora é válida
  const transportadorasValidas = ['ACERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR'];
  if (!transportadorasValidas.includes(transportadoraId)) {
    return res.status(400).json({ 
      error: `Transportadora inválida: ${transportadoraId}. Valores aceitos: ${transportadorasValidas.join(', ')}` 
    });
  }

  // SOLUÇÃO TEMPORÁRIA: Mapear RETIRA_VENDEDOR para uma transportadora existente no banco
  // Isso permite que a funcionalidade funcione sem alterar o enum do banco
  let transportadoraParaBanco = transportadoraId as Transportadora;
  if ((transportadoraId as string) === 'RETIRA_VENDEDOR') {
    transportadoraParaBanco = 'TERCEIRIZADA' as Transportadora; // Usar TERCEIRIZADA como base no banco
    console.log('[Motorista] Mapeando RETIRA_VENDEDOR -> TERCEIRIZADA para compatibilidade com banco');
  }

  try {
    console.log('[Motorista] Verificando duplicidade por CPF:', cpf);
    
    // Verificar duplicidade por CPF
    const existente = await prisma.motorista.findUnique({ where: { cpf } });
    if (existente) {
      console.log('[Motorista] CPF já existe:', existente);
      return res.status(400).json({ error: 'Já existe motorista com esse CPF' });
    }

    console.log('[Motorista] Criando motorista com dados:', { 
      nome, telefone, cpf, cnh, 
      transportadoraOriginal: transportadoraId,
      transportadoraParaBanco 
    });
    
    // Criar motorista usando a transportadora mapeada para o banco
    // Se for RETIRA_VENDEDOR, adicionar um marcador no nome para identificar depois
    let nomeParaSalvar = nome;
    if ((transportadoraId as string) === 'RETIRA_VENDEDOR') {
      nomeParaSalvar = `${nome} [RV]`; // Adicionar marcador [RV] = Retira Vendedor
    }
    
    const novo = await prisma.motorista.create({
      data: { nome: nomeParaSalvar, telefone, cpf, cnh, transportadoraId: transportadoraParaBanco },
    });
    
    // Se foi mapeado RETIRA_VENDEDOR, ajustar o retorno para mostrar a transportadora original e nome limpo
    if ((transportadoraId as string) === 'RETIRA_VENDEDOR') {
      (novo as any).transportadoraId = 'RETIRA_VENDEDOR';
      (novo as any).nome = nome; // Retornar nome sem o marcador
    }
    
    console.log('[Motorista] Motorista criado com sucesso:', novo);
    
    return res.status(201).json(novo);
  } catch (error: any) {
    console.error('[Motorista] Erro detalhado ao criar motorista:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      message: error.message,
      code: error.code,
      details: error.meta 
    });
  }
}
