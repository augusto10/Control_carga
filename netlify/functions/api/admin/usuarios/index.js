const { withCors, authenticate, requireAdmin, prisma } = require('../../../_utils');

const handler = async (event, context) => {
  // Listar usuários (GET)
  if (event.httpMethod === 'GET') {
    const { query } = event;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const search = query.search || '';
    const tipo = query.tipo;

    const where = {};
    
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tipo) {
      where.tipo = tipo;
    }

    const [usuarios, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          criadoEm: true,
          atualizadoEm: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nome: 'asc' },
      }),
      prisma.usuario.count({ where }),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: usuarios,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      }),
    };
  }

  // Criar novo usuário (POST)
  if (event.httpMethod === 'POST') {
    const { nome, email, senha, tipo } = JSON.parse(event.body);

    if (!nome || !email || !senha || !tipo) {
      throw { statusCode: 400, message: 'Todos os campos são obrigatórios' };
    }

    // Verificar se o email já está em uso
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      throw { statusCode: 400, message: 'Este email já está em uso' };
    }

    // Criptografar senha
    const hashedPassword = await require('bcryptjs').hash(senha, 10);

    const novoUsuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        tipo,
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return {
      statusCode: 201,
      body: JSON.stringify(novoUsuario),
    };
  }

  throw { statusCode: 405, message: 'Método não permitido' };
};

// Exporta o handler com autenticação, permissão de admin e CORS habilitados
module.exports.handler = withCors(authenticate(requireAdmin(handler)));
