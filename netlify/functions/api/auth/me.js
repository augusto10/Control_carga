const { withCors, authenticate } = require('../_utils');

const handler = async (event, context, prisma) => {
  if (event.httpMethod !== 'GET') {
    throw { statusCode: 405, message: 'Método não permitido' };
  }

  // Buscar usuário no banco de dados (o usuário já está autenticado pelo middleware)
  const usuario = await prisma.usuario.findUnique({
    where: { id: context.user.id },
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

  if (!usuario) {
    throw { statusCode: 404, message: 'Usuário não encontrado' };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(usuario),
  };
};

// Exporta o handler com autenticação e CORS habilitados
module.exports.handler = withCors(authenticate(handler));
