// Teste da API de ajustes de pallets
console.log('🧪 Iniciando teste da API de ajustes de pallets...');

// Vamos verificar se o servidor está rodando
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pallets/ajustes',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📝 Resposta:', data);
  });
});

req.on('error', (error) => {
  console.error('💥 Erro na requisição:', error);
});

req.end();
