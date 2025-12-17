import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '@/lib/prisma';
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
  console.log('[API funcionarios-clientes-safe] Requisição recebida');
  console.log('[API funcionarios-clientes-safe] Método:', req.method);

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

// GET - Listar funcionários/clientes usando SQL raw
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { tipo, ativo, search } = req.query;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;
    
    if (tipo && typeof tipo === 'string') {
      whereClause += ` AND tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }
    
    if (ativo !== undefined) {
      whereClause += ` AND ativo = $${paramIndex}`;
      params.push(ativo === 'true');
      paramIndex++;
    }
    
    if (search && typeof search === 'string') {
      whereClause += ` AND (
        nome ILIKE $${paramIndex} OR 
        cpf ILIKE $${paramIndex} OR 
        telefone ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT * FROM "FuncionarioCliente" 
      ${whereClause}
      ORDER BY ativo DESC, nome ASC
    `;

    const funcionariosClientes = await prisma.$queryRawUnsafe(query, ...params);

    return res.status(200).json({
      success: true,
      data: funcionariosClientes,
      total: Array.isArray(funcionariosClientes) ? funcionariosClientes.length : 0
    });

  } catch (error: any) {
    console.error('Erro ao buscar funcionários/clientes:', error);
    
    // Se a tabela não existir, retorna lista vazia
    if (error.message.includes('does not exist')) {
      return res.status(200).json({
        success: true,
        data: [],
        total: 0,
        message: 'Tabela ainda não foi criada. Execute a migração primeiro.'
      });
    }
    
    return res.status(500).json({
      error: 'Erro ao buscar funcionários/clientes',
      details: error.message
    });
  }
}

// POST - Criar funcionário/cliente usando SQL raw
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[API funcionarios-clientes-safe] Dados recebidos:', req.body);

    // Validação dos dados
    const validation = funcionarioClienteSchema.safeParse(req.body);
    
    if (!validation.success) {
      console.error('[API funcionarios-clientes-safe] Validação falhou:', validation.error.issues);
      const errorMessage = validation.error.issues.map((err: any) => err.message).join('; ');
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: errorMessage
      });
    }

    const dados = validation.data;

    // Verifica se CPF já existe (se fornecido)
    if (dados.cpf) {
      const cpfExistente = await prisma.$queryRawUnsafe(
        'SELECT id FROM "FuncionarioCliente" WHERE cpf = $1 LIMIT 1',
        dados.cpf
      );

      if (Array.isArray(cpfExistente) && cpfExistente.length > 0) {
        return res.status(409).json({
          error: 'CPF já cadastrado',
          code: 'CPF_DUPLICADO'
        });
      }
    }

    // Verifica se email já existe (se fornecido)
    if (dados.email) {
      const emailExistente = await prisma.$queryRawUnsafe(
        'SELECT id FROM "FuncionarioCliente" WHERE email = $1 LIMIT 1',
        dados.email
      );

      if (Array.isArray(emailExistente) && emailExistente.length > 0) {
        return res.status(409).json({
          error: 'Email já cadastrado',
          code: 'EMAIL_DUPLICADO'
        });
      }
    }

    // Gera um UUID para o ID
    const id = require('crypto').randomUUID();

    // Cria o funcionário/cliente usando SQL raw
    const insertQuery = `
      INSERT INTO "FuncionarioCliente" (
        id, nome, cpf, telefone, email, tipo, "transportadoraId", cnh, ativo, observacoes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await prisma.$queryRawUnsafe(
      insertQuery,
      id,
      dados.nome,
      dados.cpf || null,
      dados.telefone || null,
      dados.email || null,
      dados.tipo,
      dados.transportadoraId || null,
      dados.cnh || null,
      dados.ativo,
      dados.observacoes || null
    );

    console.log('[API funcionarios-clientes-safe] Funcionário/cliente criado:', id);

    return res.status(201).json({
      success: true,
      message: 'Funcionário/cliente criado com sucesso',
      data: Array.isArray(result) ? result[0] : result
    });

  } catch (error: any) {
    console.error('Erro ao criar funcionário/cliente:', error);
    
    // Se a tabela não existir
    if (error.message.includes('does not exist')) {
      return res.status(500).json({
        error: 'Tabela FuncionarioCliente não existe. Execute a migração primeiro.',
        code: 'TABELA_NAO_EXISTE'
      });
    }
    
    if (error.code === '23505') { // Unique violation
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

