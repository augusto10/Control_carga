import { NextApiRequest, NextApiResponse } from 'next';
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Iniciando atualização de controle com dados:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
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
    if (!controleId) {
      return res.status(400).json({ error: 'ID do controle não informado' });
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

    // Busca o controle existente para manter a data de criação original
    const controleExistente = await prisma.controleCarga.findUnique({
      where: { id: controleId },
      select: { 
        dataCriacao: true,
        finalizado: true
      }
    });

    if (!controleExistente) {
      return res.status(404).json({ error: 'Controle não encontrado' });
    }

    if (controleExistente.finalizado) {
      return res.status(400).json({ error: 'Não é possível editar um controle finalizado' });
    }

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

    // Atualiza o controle
    const controleAtualizado = await prisma.controleCarga.update({
      where: { id: controleId },
      data: dadosAtualizacao,
      include: {
        notas: true
      }
    });

    res.status(200).json({ 
      message: 'Controle atualizado com sucesso',
      controle: controleAtualizado
    });
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
