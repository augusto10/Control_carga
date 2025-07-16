const { withCors, authenticate, requireAdmin, prisma } = require('../../../../_utils');

const handler = async (event, context) => {
  const { id } = event.pathParameters;
  
  // Obter usuário por ID (GET)
  if (event.httpMethod === 'GET') {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
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
  }

  // Atualizar usuário (PUT)
  if (event.httpMethod === 'PUT') {
    const { nome, email, tipo, ativo } = JSON.parse(event.body);

    // Verificar se o usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    // Verificar se o email já está em uso por outro usuário
    if (email && email !== usuarioExistente.email) {
      const emailEmUso = await prisma.usuario.findFirst({
        where: {
          email,
          NOT: { id },
        },
      });

      if (emailEmUso) {
        throw { statusCode: 400, message: 'Este email já está em uso' };
      }
    }

    const dadosAtualizacao = {};
    if (nome) dadosAtualizacao.nome = nome;
    if (email) dadosAtualizacao.email = email;
    if (tipo) dadosAtualizacao.tipo = tipo;
    if (typeof ativo === 'boolean') dadosAtualizacao.ativo = ativo;

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: dadosAtualizacao,
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
      statusCode: 200,
      body: JSON.stringify(usuarioAtualizado),
    };
  }

  // Excluir usuário (DELETE)
  if (event.httpMethod === 'DELETE') {
    // Verificar se o usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      throw { statusCode: 404, message: 'Usuário não encontrado' };
    }

    // Não permitir que o próprio usuário se exclua
    if (id === context.user.id) {
      throw { statusCode: 400, message: 'Você não pode excluir seu próprio usuário' };
    }

    // Excluir o usuário
    await prisma.usuario.delete({
      where: { id },
    });

    return {
      statusCode: 204,
      body: '',
    };
  }

  throw { statusCode: 405, message: 'Método não permitido' };
};

// Exporta o handler com autenticação, permissão de admin e CORS habilitados
module.exports.handler = withCors(authenticate(requireAdmin(handler)));
