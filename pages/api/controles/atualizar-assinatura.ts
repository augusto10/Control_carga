import { NextApiRequest, NextApiResponse } from 'next';
import { verify, decode } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../lib/prisma';
import { z } from 'zod';

// Esquema de validação para o corpo da requisição
const assinaturaSchema = z.object({
  controleId: z.string().min(1, 'ID do controle é obrigatório'),
  tipo: z.enum(['motorista', 'responsavel']),
  assinatura: z.string()
    .min(100, 'Assinatura inválida')
    .refine(data => data.startsWith('data:image/'), {
      message: 'Formato de assinatura inválido. Deve ser uma imagem em base64.'
    })
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API atualizar-assinatura] Requisição recebida');
  console.log('[API atualizar-assinatura] Método:', req.method);
  console.log('[API atualizar-assinatura] Body:', {
    controleId: req.body?.controleId,
    tipo: req.body?.tipo,
    assinaturaLength: req.body?.assinatura?.length || 0
  });
  
  // Verifica o método HTTP
  if (req.method !== 'POST') {
    console.log('[API atualizar-assinatura] Método não permitido:', req.method);
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: `Método ${req.method} não permitido`,
      allowed: ['POST']
    });
  }

  // Verificação de autenticação
  const cookies = parseCookies({ req });
  let token = cookies.auth_token;
  const JWT_SECRET = process.env.JWT_SECRET;

  // Permite autenticação via header Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
    console.log('[API] Token JWT recebido via header Authorization');
  } else if (token) {
    console.log('[API] Token JWT recebido via cookie');
  } else {
    console.warn('[API] Nenhum token JWT fornecido');
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET não configurado');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
  }

  try {
    // Verifica e decodifica o token para obter informações do usuário
    const decodedToken = verify(token, JWT_SECRET) as { userId?: string; role?: string; tipo?: string };
    console.log('[API] Payload JWT decodificado:', decodedToken);
    // Aceita tanto role quanto tipo
    const userRole = decodedToken.role || decodedToken.tipo || '';
    
    // Validação do corpo da requisição
    console.log('[API atualizar-assinatura] Iniciando validação dos dados');
    const validation = assinaturaSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.error('[API atualizar-assinatura] Validação falhou:', validation.error.issues);
      const errorMessage = validation.error.issues.map((err: any) => err.message).join('; ');
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errorMessage
      });
    }
    
    console.log('[API atualizar-assinatura] Validação bem-sucedida');
    const { controleId, tipo, assinatura } = validation.data;
    console.log('[API atualizar-assinatura] Dados validados:', {
      controleId,
      tipo,
      assinaturaLength: assinatura.length
    });
    
    // Verifica se o usuário tem permissão para acessar este recurso
    const allowedRoles = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'AUDITOR', 'CONFERENTE'];
    if (!allowedRoles.includes(userRole)) {
      console.log('[API] Permissão negada para role:', decodedToken.role, 'Roles permitidas:', allowedRoles);
      return res.status(403).json({ 
        error: 'Você não tem permissão para essa ação',
        code: 'PERMISSAO_NEGADA'
      });
    }

    // Verifica se o controle existe
    const controleExistente = await prisma.controleCarga.findUnique({
      where: { 
        id: controleId
      },
      select: { 
        finalizado: true
      }
    });

    if (!controleExistente) {
      return res.status(404).json({ 
        error: 'Controle não encontrado ou você não tem permissão para acessá-lo' 
      });
    }

    console.log('[API atualizar-assinatura] Iniciando processo de salvamento');
    console.log('[API atualizar-assinatura] Prisma disponível:', !!prisma);
    
    try {
      // Executa a atualização da assinatura em uma transação
      console.log('[API atualizar-assinatura] Iniciando transação do banco de dados');
      const resultado = await prisma.$transaction(async (tx) => {
        console.log('[API atualizar-assinatura] Dentro da transação');
        // Primeiro, verifica se o controle existe
        console.log('[API atualizar-assinatura] Verificando se o controle existe:', controleId);
        const controleExistente = await tx.controleCarga.findUnique({
          where: { id: controleId },
          select: {
            id: true
          }
        });
        
        console.log('[API atualizar-assinatura] Controle encontrado:', !!controleExistente);
        
        if (!controleExistente) {
          throw new Error('Controle não encontrado');
        }
        
        // Prepara os dados para atualização
        const dadosAtualizacao = {
          [`assinatura${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`]: assinatura,
          [`dataAssinatura${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`]: new Date()
        };
        
        console.log('[API atualizar-assinatura] Dados de atualização:', dadosAtualizacao);
        
        // Atualiza o controle com a assinatura
        const controleAtualizado = await tx.controleCarga.update({
          where: { id: controleId },
          data: dadosAtualizacao,
          include: {
            notas: true
          }
        });
        
        console.log('[API atualizar-assinatura] Controle atualizado com sucesso');
        return controleAtualizado;
      });

      return res.status(200).json({ 
        success: true,
        message: 'Assinatura salva com sucesso',
        controle: resultado
      });
    } catch (dbError: any) {
      console.error('Erro ao atualizar o banco de dados:', dbError);
      console.error('Tipo do erro:', typeof dbError);
      console.error('Nome do erro:', dbError?.name);
      console.error('Mensagem do erro:', dbError?.message);
      console.error('Stack trace do erro do DB:', dbError?.stack);
      
      // Retorna erro mais específico baseado no tipo de erro do banco
      if (dbError?.code === 'P2002') {
        return res.status(409).json({
          error: 'Conflito: Registro já existe',
          code: 'DUPLICATE_ENTRY'
        });
      }
      
      if (dbError?.code === 'P2025') {
        return res.status(404).json({
          error: 'Controle não encontrado',
          code: 'CONTROLE_NAO_ENCONTRADO'
        });
      }
      
      return res.status(500).json({
        error: 'Falha ao salvar a assinatura no banco de dados',
        details: dbError?.message || 'Erro desconhecido do banco de dados',
        code: 'DATABASE_ERROR'
      });
    }

  } catch (error: any) {
    console.error('Erro ao processar a requisição:', error);
    if (error && error.stack) {
      console.error('Stack trace:', error.stack);
    }
    // Tratamento de erros específicos
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token inválido',
        code: 'TOKEN_INVALIDO'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Sessão expirada. Faça login novamente.',
        code: 'SESSAO_EXPIRADA'
      });
    }
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.errors,
        code: 'DADOS_INVALIDOS'
      });
    }
    
    // Erros do Prisma
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Conflito de dados. O registro já existe.',
        code: 'REGISTRO_DUPLICADO'
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Registro não encontrado',
        code: 'REGISTRO_NAO_ENCONTRADO'
      });
    }
    
    // Resposta de erro genérica
    const errorResponse = {
      error: 'Erro ao processar a requisição',
      code: 'ERRO_INTERNO',
      ...(process.env.NODE_ENV === 'development' && {
        message: error.message,
        stack: error.stack
      })
    };
    
    return res.status(500).json(errorResponse);
  }
}
