// Este é um middleware vazio que será usado para todas as rotas de API
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "API em execução" }),
  };
};
