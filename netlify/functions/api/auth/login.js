// netlify/functions/api/auth/login.js
const { handler } = require('../../../../.next/server/pages/api/auth/login');

// Exporta o handler do Next.js
module.exports = async (event, context) => {
  // Converte o evento do Netlify para o formato do Next.js
  const req = {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body,
    query: event.queryStringParameters,
  };

  const res = {
    statusCode: 200,
    headers: {},
    setHeader: (key, value) => {
      res.headers[key] = value;
    },
    end: (data) => {
      res.body = data;
    },
    json: (data) => {
      res.body = JSON.stringify(data);
    },
  };

  try {
    await handler(req, res);
    return {
      statusCode: res.statusCode || 200,
      headers: res.headers,
      body: res.body,
    };
  } catch (error) {
    console.error('Erro na função de login:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno do servidor' }),
    };
  }
};
