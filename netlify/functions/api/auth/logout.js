const { withCors, authenticate } = require('../_utils');

const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    throw { statusCode: 405, message: 'Método não permitido' };
  }

  // Invalida o token definindo um cookie vazio com expiração no passado
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax',
    },
    body: JSON.stringify({ message: 'Logout realizado com sucesso' }),
  };
};

// Exporta o handler com CORS habilitado
module.exports.handler = withCors(handler);
