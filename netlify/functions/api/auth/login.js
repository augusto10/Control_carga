const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { withCors, prisma } = require('../_utils');

const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    throw { statusCode: 405, message: 'Método não permitido' };
  }

  const { email, senha } = JSON.parse(event.body);

  if (!email || !senha) {
    throw { statusCode: 400, message: 'Email e senha são obrigatórios' };
  }

  // Buscar usuário no banco de dados
  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  if (!usuario) {
    throw { statusCode: 401, message: 'Credenciais inválidas' };
  }

  // Verificar se o usuário está ativo
  if (!usuario.ativo) {
    throw { statusCode: 403, message: 'Usuário desativado' };
  }

  // Verificar senha
  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    throw { statusCode: 401, message: 'Credenciais inválidas' };
  }

  // Criar token JWT
  const token = jwt.sign(
    { 
      id: usuario.id, 
      email: usuario.email, 
      tipo: usuario.tipo,
      nome: usuario.nome
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  // Retornar token e informações do usuário (sem a senha)
  const { senha: _, ...usuarioSemSenha } = usuario;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `token=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
    },
    body: JSON.stringify({
      usuario: usuarioSemSenha,
      token,
    }),
  };
};

// Exporta o handler com CORS habilitado
module.exports.handler = withCors(handler);
