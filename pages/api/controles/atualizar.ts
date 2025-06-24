import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import prisma from '../../../lib/prisma';

// Interface para erros personalizados
interface ApiError extends Error {
  code?: string;
  statusCode?: number;
}

// Valida o formato do CPF (apenas dígitos, 11 caracteres)
const validarCPF = (cpf: string): boolean => {
  if (!cpf) return false;
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.length === 11;
};

// Função para formatar erros de validação do Prisma
function formatPrismaError(error: any): string {
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'campo';
    return `Já existe um registro com este ${field}.`;
  }
  return error.message || 'Erro desconhecido no banco de dados';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== INÍCIO DA ATUALIZAÇÃO DE CONTROLE ===');
  console.log('Método:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  // Adiciona cabeçalhos para evitar cache
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  if (req.method !== 'POST') {
    const errorMsg = `Método ${req.method} não permitido`;
    console.error('Erro:', errorMsg);
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      success: false,
      error: errorMsg 
    });
  }

  // === Verificação de autenticação ===
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  let usuarioTipo: string | null = null;
  if (token) {
    try {
      const decoded = verify(token, JWT_SECRET) as { id: string; tipo: string };
      usuarioTipo = decoded.tipo;
    } catch (err) {
      console.warn('Token inválido ou expirado ao atualizar controle:', err);
    }
  }

  try {
    // Verifica se o corpo da requisição está vazio
    if (!req.body || Object.keys(req.body).length === 0) {
      const errorMsg = 'Corpo da requisição vazio';
      console.error('Erro de validação:', errorMsg);
      return res.status(400).json({ 
        success: false, 
        error: errorMsg 
      });
    }

    const { 
      controleId, 
      motorista, 
      responsavel, 
      cpfMotorista, 
      transportadora, 
      qtdPallets, 
      observacao 
    } = req.body;
    
    console.log('Validando dados de entrada:', {
      controleId,
      motorista: motorista?.trim(),
      responsavel: responsavel?.trim(),
      cpfMotorista: cpfMotorista?.replace(/\D/g, ''),
      transportadora,
      qtdPallets,
      observacao
    });

    // Validação dos campos obrigatórios
    const erros: string[] = [];
    
    if (!controleId) {
      erros.push('ID do controle não informado');
    }
    
    if (!motorista?.trim()) {
      erros.push('Nome do motorista é obrigatório');
    } else if (motorista.trim().length < 3) {
      erros.push('O nome do motorista deve ter pelo menos 3 caracteres');
    }
    
    if (!responsavel?.trim()) {
      erros.push('Nome do responsável é obrigatório');
    } else if (responsavel.trim().length < 3) {
      erros.push('O nome do responsável deve ter pelo menos 3 caracteres');
    }
    
    if (!cpfMotorista?.trim()) {
      erros.push('CPF do motorista é obrigatório');
    } else if (!validarCPF(cpfMotorista)) {
      erros.push('CPF inválido. Deve conter 11 dígitos numéricos.');
    }
    
    if (!transportadora) {
      erros.push('Transportadora é obrigatória');
    }
    
    if (erros.length > 0) {
      console.error('Erros de validação:', erros);
      return res.status(400).json({ 
        success: false, 
        error: 'Erro de validação',
        details: erros 
      });
    }

    if (!motorista?.trim()) {
      return res.status(400).json({ error: 'Nome do motorista é obrigatório' });
    }

    if (!responsavel?.trim()) {
      return res.status(400).json({ error: 'Nome do responsável é obrigatório' });
    }

    if (!cpfMotorista?.trim()) {
      return res.status(400).json({ error: 'CPF do motorista é obrigatório' });
    }

    if (!validarCPF(cpfMotorista)) {
      console.error('CPF inválido:', cpfMotorista);
      return res.status(400).json({ 
        error: 'CPF inválido. Deve conter 11 dígitos numéricos.',
        received: cpfMotorista
      });
    }

    if (!transportadora) {
      return res.status(400).json({ error: 'Transportadora é obrigatória' });
    }

    console.log('Buscando controle existente...');
    let controleExistente;
    try {
      controleExistente = await prisma.controleCarga.findUnique({
        where: { id: controleId },
        select: { 
          dataCriacao: true,
          finalizado: true
        }
      });

      if (!controleExistente) {
        const errorMsg = `Controle com ID ${controleId} não encontrado`;
        console.error('Erro:', errorMsg);
        return res.status(404).json({ 
          success: false, 
          error: errorMsg 
        });
      }

      if (controleExistente.finalizado) {
        const podeEditarFinalizado = usuarioTipo === 'GERENTE' || usuarioTipo === 'ADMIN';
        if (!podeEditarFinalizado) {
          const errorMsg = 'Somente GERENTE ou ADMIN podem editar um controle finalizado';
          console.error('Erro:', errorMsg);
          return res.status(403).json({ 
            success: false, 
            error: errorMsg 
          });
        }
      }
    } catch (error: unknown) {
      console.error('Erro ao buscar controle existente:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return res.status(500).json({
        success: false,
        error: 'Erro ao verificar o controle no banco de dados',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }

    try {
      // Prepara os dados para atualização
      const dadosAtualizacao = {
        motorista: motorista.trim(),
        responsavel: responsavel.trim(),
        cpfMotorista: cpfMotorista.replace(/\D/g, ''), // Remove formatação do CPF
        transportadora,
        qtdPallets: qtdPallets !== undefined ? Number(qtdPallets) : 0,
        ...(observacao !== undefined && { observacao: observacao.trim() }),
        // Mantém a data de criação original
        dataCriacao: controleExistente.dataCriacao,
      };

      console.log('Dados para atualização:', JSON.stringify(dadosAtualizacao, null, 2));
      console.log('Atualizando controle no banco de dados...');
      
      const controleAtualizado = await prisma.controleCarga.update({
        where: { id: controleId },
        data: dadosAtualizacao,
        include: {
          notas: true
        }
      });

      console.log('Controle atualizado com sucesso:', controleAtualizado);
      
      // Retorna a resposta com os dados atualizados
      return res.status(200).json({ 
        success: true,
        message: 'Controle atualizado com sucesso',
        controle: controleAtualizado
      });
      
    } catch (dbError: unknown) {
      console.error('Erro ao atualizar no banco de dados:', dbError);
      
      let errorMessage = 'Erro ao atualizar o controle';
      let errorDetails: any = undefined;
      
      if (dbError instanceof Error) {
        errorMessage = dbError.message;
        
        // Se for um erro do Prisma, formata a mensagem
        if ('code' in dbError) {
          errorMessage = formatPrismaError(dbError);
          errorDetails = process.env.NODE_ENV === 'development' ? dbError : undefined;
        }
      }
      
      return res.status(500).json({
        success: false,
        error: errorMessage,
        details: errorDetails
      });
    }
  } catch (error: unknown) {
    console.error('Erro ao atualizar controle:', error);
    
    // Tratamento de erros específicos do Prisma
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Controle não encontrado' });
      }
      
      // Outros erros comuns do Prisma
      return res.status(400).json({ 
        error: 'Erro na requisição ao banco de dados',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // Erros de validação personalizados
    if (error instanceof Error) {
      return res.status(400).json({ 
        error: error.message || 'Erro ao processar a requisição',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    
    // Erro genérico
    res.status(500).json({ 
      error: 'Ocorreu um erro inesperado',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}
