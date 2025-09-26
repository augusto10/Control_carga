import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../lib/prisma';
import { z } from 'zod';

// Schema de validação para funcionário/cliente
const funcionarioClienteSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  tipo: z.enum(['MOTORISTA', 'FUNCIONARIO', 'CLIENTE', 'RESPONSAVEL']),
  transportadoraId: z.enum(['ACERT', 'EXPRESSO_GOIAS', 'ACCERT', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR']).optional(),
  cnh: z.string().optional(),
  ativo: z.boolean().default(true),
  observacoes: z.string().optional()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('[API funcionarios-clientes] Requisição recebida');
  console.log('[API funcionarios-clientes] Método:', req.method);

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
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST']);
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

// GET - Listar funcionários/clientes
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tipo, ativo, search } = req.query;

    const where: any = {};
    
    if (tipo && typeof tipo === 'string') {
      where.tipo = tipo;
    }
    
    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }
    
    if (search && typeof search === 'string') {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } },
        { telefone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const funcionariosClientes = await prisma.funcionarioCliente.findMany({
      where,
      orderBy: [
        { ativo: 'desc' },
        { nome: 'asc' }
      ]
    });

    return res.status(200).json({
      success: true,
      data: funcionariosClientes,
      total: funcionariosClientes.length
    });

  } catch (error: any) {
    console.error('Erro ao buscar funcionários/clientes:', error);
    return res.status(500).json({
      error: 'Erro ao buscar funcionários/clientes',
      details: error.message
    });
  }
}

// POST - Criar funcionário/cliente
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[API funcionarios-clientes] Dados recebidos:', req.body);

    // Validação dos dados
    const validation = funcionarioClienteSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.error('[API funcionarios-clientes] Validação falhou:', validation.error.issues);
      const errorMessage = validation.error.issues.map((err: any) => err.message).join('; ');
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errorMessage
      });
    }

    const dados = validation.data;

    // Verifica se CPF já existe (se fornecido)
    if (dados.cpf) {
      const cpfExistente = await prisma.funcionarioCliente.findFirst({
        where: { cpf: dados.cpf }
      });

      if (cpfExistente) {
        return res.status(409).json({
          error: 'CPF já cadastrado',
          code: 'CPF_DUPLICADO'
        });
      }
    }

    // Verifica se email já existe (se fornecido)
    if (dados.email) {
      const emailExistente = await prisma.funcionarioCliente.findFirst({
        where: { email: dados.email }
      });

      if (emailExistente) {
        return res.status(409).json({
          error: 'Email já cadastrado',
          code: 'EMAIL_DUPLICADO'
        });
      }
    }

    // Cria o funcionário/cliente
    const novoFuncionarioCliente = await prisma.funcionarioCliente.create({
      data: {
        nome: dados.nome,
        cpf: dados.cpf || null,
        telefone: dados.telefone || null,
        email: dados.email || null,
        tipo: dados.tipo,
        transportadoraId: dados.transportadoraId || null,
        cnh: dados.cnh || null,
        ativo: dados.ativo,
        observacoes: dados.observacoes || null
      }
    });

    console.log('[API funcionarios-clientes] Funcionário/cliente criado:', novoFuncionarioCliente.id);

    return res.status(201).json({
      success: true,
      message: 'Funcionário/cliente criado com sucesso',
      data: novoFuncionarioCliente
    });

  } catch (error: any) {
    console.error('Erro ao criar funcionário/cliente:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Dados duplicados. Verifique CPF e email.',
        code: 'DADOS_DUPLICADOS'
      });
    }
    
    return res.status(500).json({
      error: 'Erro ao criar funcionário/cliente',
      details: error.message
    });
  }
}
