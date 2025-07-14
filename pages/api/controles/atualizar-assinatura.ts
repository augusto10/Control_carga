import { NextApiRequest, NextApiResponse } from 'next';
import { verify, decode } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../lib/prisma';
import { z } from 'zod';

// Esquema de validação para o corpo da requisição
const assinaturaSchema = z.object({
  controleId: z.string().min(1, 'ID do controle é obrigatório'),
  tipo: z.enum(['motorista', 'responsavel'], {
    errorMap: () => ({ message: 'Tipo de assinatura deve ser "motorista" ou "responsavel"' })
  }),
  assinatura: z.string()
    .min(100, 'Assinatura inválida')
    .refine(data => data.startsWith('data:image/'), {
      message: 'Formato de assinatura inválido. Deve ser uma imagem em base64.'
    })
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verifica o método HTTP
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: `Método ${req.method} não permitido`,
      allowed: ['POST']
    });
  }

  // Verificação de autenticação
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;
  const JWT_SECRET = process.env.JWT_SECRET;
  
  if (!JWT_SECRET) {
    console.error('JWT_SECRET não configurado');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
  }

  try {
    // Verifica e decodifica o token para obter informações do usuário
    const decodedToken = verify(token, JWT_SECRET) as { userId?: string; role?: string };
    
    // Validação do corpo da requisição
    const validation = assinaturaSchema.safeParse(req.body);
    
    if (!validation.success) {
      const errorMessage = validation.error.errors.map(err => err.message).join('; ');
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errorMessage
      });
    }
    
    const { controleId, tipo, assinatura } = validation.data;
    
    // Verifica se o usuário tem permissão para acessar este recurso
    if (decodedToken.role !== 'admin' && decodedToken.role !== 'user') {
      return res.status(403).json({ 
        error: 'Permissão negada' 
      });
    }

    // Verifica se o controle existe e se o usuário tem permissão para acessá-lo
    const controleExistente = await prisma.controleCarga.findUnique({
      where: { 
        id: controleId,
        // Se o usuário não for admin, verifica se ele é o criador do controle
        ...(decodedToken.role !== 'admin' ? { usuarioId: decodedToken.userId } : {})
      },
      select: { 
        finalizado: true,
        usuarioId: true
      }
    });

    if (!controleExistente) {
      return res.status(404).json({ 
        error: 'Controle não encontrado ou você não tem permissão para acessá-lo' 
      });
    }

    try {
      // Prepara os dados para atualização em uma transação
      const dadosAtualizacao = {
        [`assinatura${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`]: assinatura,
        [`dataAssinatura${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`]: new Date(),
        atualizadoEm: new Date()
      };

      // Atualiza o controle com a assinatura em uma transação
      const [controleAtualizado] = await prisma.$transaction([
        prisma.controleCarga.update({
          where: { id: controleId },
          data: dadosAtualizacao,
          include: {
            notas: true,
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        }),
        // Registra a ação no log de atividades
        prisma.logAtividade.create({
          data: {
            acao: `Assinatura do ${tipo} adicionada`,
            tabela: 'ControleCarga',
            registroId: controleId,
            usuarioId: decodedToken.userId || 'sistema',
            dadosAntigos: {},
            dadosNovos: {
              tipoAssinatura: tipo,
              dataAssinatura: new Date()
            }
          }
        })
      ]);

      // Remove dados sensíveis antes de retornar
      const { usuario, ...controleSemDadosSensiveis } = controleAtualizado;
      
      return res.status(200).json({ 
        success: true,
        message: 'Assinatura salva com sucesso',
        controle: {
          ...controleSemDadosSensiveis,
          usuario: {
            id: usuario?.id,
            nome: usuario?.nome
            // Não incluir email ou outros dados sensíveis
          }
        }
      });
    } catch (dbError) {
      console.error('Erro ao atualizar o banco de dados:', dbError);
      throw new Error('Falha ao salvar a assinatura no banco de dados');
    }

  } catch (error: any) {
    console.error('Erro ao processar a requisição:', error);
    
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
