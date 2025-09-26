import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização
const updateFuncionarioClienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').optional(),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  tipo: z.enum(['MOTORISTA', 'FUNCIONARIO', 'CLIENTE', 'RESPONSAVEL']).optional(),
  transportadoraId: z.enum(['ACERT', 'EXPRESSO_GOIAS', 'ACCERT', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR']).optional(),
  cnh: z.string().optional(),
  ativo: z.boolean().optional(),
  observacoes: z.string().optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API funcionarios-clientes/[id]] Requisição recebida');
  console.log('[API funcionarios-clientes/[id]] Método:', req.method);
  console.log('[API funcionarios-clientes/[id]] ID:', req.query.id);

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
  }

  // Verificação de autenticação
  const cookies = parseCookies({ req });
  let token = cookies.auth_token;
  const JWT_SECRET = process.env.JWT_SECRET;

  // Permite autenticação via header Authorization
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.replace('Bearer ', '').trim();
  }

  if (!JWT_SECRET) {
    console.error('JWT_SECRET não configurado');
    return res.status(500).json({ error: 'Erro de configuração do servidor' });
  }

  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
  }

  try {
    // Verifica e decodifica o token
    const decodedToken = verify(token, JWT_SECRET) as { userId?: string; role?: string; tipo?: string };
    const userRole = decodedToken.role || decodedToken.tipo || '';
    
    // Verifica permissões
    const allowedRoles = ['ADMIN', 'GERENTE'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Você não tem permissão para essa ação',
        code: 'PERMISSAO_NEGADA'
      });
    }

    switch (req.method) {
      case 'GET':
        return await handleGet(req, res, id);
      case 'PUT':
        return await handlePut(req, res, id);
      case 'DELETE':
        return await handleDelete(req, res, id);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Método ${req.method} não permitido` });
    }

  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
    
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// GET - Buscar funcionário/cliente por ID
async function handleGet(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const funcionarioCliente = await prisma.funcionarioCliente.findUnique({
      where: { id }
    });

    if (!funcionarioCliente) {
      return res.status(404).json({
        error: 'Funcionário/cliente não encontrado',
        code: 'NAO_ENCONTRADO'
      });
    }

    return res.status(200).json({
      success: true,
      data: funcionarioCliente
    });

  } catch (error: any) {
    console.error('Erro ao buscar funcionário/cliente:', error);
    return res.status(500).json({
      error: 'Erro ao buscar funcionário/cliente',
      details: error.message
    });
  }
}

// PUT - Atualizar funcionário/cliente
async function handlePut(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    console.log('[API funcionarios-clientes/[id]] Dados para atualização:', req.body);

    // Validação dos dados
    const validation = updateFuncionarioClienteSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.error('[API funcionarios-clientes/[id]] Validação falhou:', validation.error.issues);
      const errorMessage = validation.error.issues.map((err: any) => err.message).join('; ');
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errorMessage
      });
    }

    const dados = validation.data;

    // Verifica se o funcionário/cliente existe
    const funcionarioExistente = await prisma.funcionarioCliente.findUnique({
      where: { id }
    });

    if (!funcionarioExistente) {
      return res.status(404).json({
        error: 'Funcionário/cliente não encontrado',
        code: 'NAO_ENCONTRADO'
      });
    }

    // Verifica se CPF já existe em outro registro (se fornecido)
    if (dados.cpf && dados.cpf !== funcionarioExistente.cpf) {
      const cpfExistente = await prisma.funcionarioCliente.findFirst({
        where: { 
          cpf: dados.cpf,
          id: { not: id }
        }
      });

      if (cpfExistente) {
        return res.status(409).json({
          error: 'CPF já cadastrado em outro registro',
          code: 'CPF_DUPLICADO'
        });
      }
    }

    // Verifica se email já existe em outro registro (se fornecido)
    if (dados.email && dados.email !== funcionarioExistente.email) {
      const emailExistente = await prisma.funcionarioCliente.findFirst({
        where: { 
          email: dados.email,
          id: { not: id }
        }
      });

      if (emailExistente) {
        return res.status(409).json({
          error: 'Email já cadastrado em outro registro',
          code: 'EMAIL_DUPLICADO'
        });
      }
    }

    // Prepara os dados para atualização (remove campos undefined)
    const dadosAtualizacao: any = {};
    Object.keys(dados).forEach(key => {
      const value = (dados as any)[key];
      if (value !== undefined) {
        dadosAtualizacao[key] = value === '' ? null : value;
      }
    });

    // Atualiza o funcionário/cliente
    const funcionarioAtualizado = await prisma.funcionarioCliente.update({
      where: { id },
      data: dadosAtualizacao
    });

    console.log('[API funcionarios-clientes/[id]] Funcionário/cliente atualizado:', funcionarioAtualizado.id);

    return res.status(200).json({
      success: true,
      message: 'Funcionário/cliente atualizado com sucesso',
      data: funcionarioAtualizado
    });

  } catch (error: any) {
    console.error('Erro ao atualizar funcionário/cliente:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Dados duplicados. Verifique CPF e email.',
        code: 'DADOS_DUPLICADOS'
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Funcionário/cliente não encontrado',
        code: 'NAO_ENCONTRADO'
      });
    }
    
    return res.status(500).json({
      error: 'Erro ao atualizar funcionário/cliente',
      details: error.message
    });
  }
}

// DELETE - Excluir funcionário/cliente
async function handleDelete(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // Verifica se o funcionário/cliente existe
    const funcionarioExistente = await prisma.funcionarioCliente.findUnique({
      where: { id }
    });

    if (!funcionarioExistente) {
      return res.status(404).json({
        error: 'Funcionário/cliente não encontrado',
        code: 'NAO_ENCONTRADO'
      });
    }

    // Exclui o funcionário/cliente
    await prisma.funcionarioCliente.delete({
      where: { id }
    });

    console.log('[API funcionarios-clientes/[id]] Funcionário/cliente excluído:', id);

    return res.status(200).json({
      success: true,
      message: 'Funcionário/cliente excluído com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao excluir funcionário/cliente:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Funcionário/cliente não encontrado',
        code: 'NAO_ENCONTRADO'
      });
    }
    
    return res.status(500).json({
      error: 'Erro ao excluir funcionário/cliente',
      details: error.message
    });
  }
}
