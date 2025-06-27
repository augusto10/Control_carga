import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { parseCookies } from 'nookies';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

// Interface para o payload do token
interface TokenPayload {
  id: string;
  email: string;
  tipo: string;
  iat: number;
  exp: number;
}

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
    res.status(200).end();
    return;
  }
  
  // Continuar para a próxima função
  return await fn(req, res);
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const cookies = parseCookies({ req });
    const token = cookies.auth_token;
    
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    // Verificar e decodificar o token
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Verificar se o usuário existe e está ativo
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, ativo: true }
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ error: 'Usuário não autorizado ou inativo' });
    }

    const { notas } = req.body;

    if (!Array.isArray(notas) || notas.length === 0) {
      return res.status(400).json({ error: 'Nenhuma nota fornecida' });
    }

    // Validar campos obrigatórios
    console.log('=== VALIDAÇÃO DE NOTAS ===');
    console.log('Notas recebidas para validação:', JSON.stringify(notas, null, 2));
    
    for (const [index, nota] of notas.entries()) {
      console.log(`\n--- Validando nota ${index + 1} ---`);
      console.log('Conteúdo da nota:', JSON.stringify(nota, null, 2));
      
      // Verificar campos obrigatórios
      if (!nota.numeroNota) {
        console.error(`❌ Erro: Número da nota não fornecido para a nota ${index + 1}`);
        return res.status(400).json({ 
          error: 'Número da nota é obrigatório',
          details: `Nota ${index + 1} não possui número`
        });
      }
      
      if (!nota.volumes) {
        console.error(`❌ Erro: Volumes não fornecidos para a nota ${index + 1}`);
        return res.status(400).json({ 
          error: 'Quantidade de volumes é obrigatória',
          details: `Nota ${index + 1} (${nota.numeroNota}) não possui volumes definidos`
        });
      }
      
      console.log(`✅ Nota ${index + 1} validada com sucesso`);
    }

    // Criar múltiplas notas em uma transação
    console.log('\n=== PROCESSO DE CRIAÇÃO DAS NOTAS ===');
    const createOperations = [];
    const notasProcessadas = [];
    
    for (const [index, nota] of notas.entries()) {
      try {
        console.log(`\n--- Processando nota ${index + 1} ---`);
        
        const numeroNota = String(nota.numeroNota);
        const codigo = nota.codigo || '';
        
        // Verificar se já existe nota com o mesmo número ou código
        const notaExistente = await prisma.notaFiscal.findFirst({
          where: {
            OR: [
              { numeroNota },
              ...(codigo ? [{ codigo }] : [])
            ]
          },
          select: { id: true, numeroNota: true, codigo: true }
        });
        
        if (notaExistente) {
          const mensagemErro = 'Nota já escaneada anteriormente';
          console.error(`❌ ${mensagemErro}:`, {
            numeroNota,
            codigo,
            existente: {
              id: notaExistente.id,
              numeroNota: notaExistente.numeroNota,
              codigo: notaExistente.codigo
            }
          });
          throw new Error(mensagemErro);
        }
        
        // Preparar dados para criação
        const notaData = {
          codigo,
          numeroNota,
          volumes: String(nota.volumes || '1'),
          usuarioId: usuario.id,
          // Adiciona o controleId se estiver presente
          ...(nota.controleId && { controleId: nota.controleId })
        };
        
        console.log(`Dados para criação da nota ${index + 1}:`, JSON.stringify(notaData, null, 2));
        
        // Adiciona a operação de criação à lista
        createOperations.push(
          prisma.notaFiscal.create({
            data: notaData
          })
        );
        
        notasProcessadas.push(notaData);
        console.log(`✅ Operação de criação da nota ${index + 1} preparada`);
        
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao preparar nota ${index + 1}:`, errorMessage);
        throw new Error(`Falha ao preparar nota ${index + 1} (${nota.numeroNota}): ${errorMessage}`);
      }
    }
    
    console.log('\n=== INICIANDO TRANSAÇÃO ===');
    console.log(`Total de operações na transação: ${createOperations.length}`);
    
    try {
      const createdNotas = await prisma.$transaction(createOperations);
      console.log('✅ Transação concluída com sucesso');
      console.log(`Total de notas criadas: ${createdNotas.length}`);
      
      return res.status(200).json({
        success: true,
        message: 'Notas salvas com sucesso!',
        notas: createdNotas
      });
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro na transação:', errorMessage);
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar as notas',
        details: errorMessage
      });
    }
  } catch (error: unknown) {
    console.error('Erro ao salvar múltiplas notas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    // Se for um erro de nota duplicada, retorna 400 (Bad Request) em vez de 500
    if (errorMessage.includes('já escaneada')) {
      return res.status(400).json({
        success: false,
        error: errorMessage,
        message: errorMessage
      });
    }
    
    // Para outros erros, retorna 500 (Internal Server Error)
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: errorMessage,
    });
  }
};

export default allowCors(handler);

// Configuração do tamanho máximo do corpo da requisição para esta rota
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
