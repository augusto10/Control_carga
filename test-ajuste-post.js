// Teste POST da API de ajustes de pallets
const http = require('http');

const postData = JSON.stringify({
  motorista: 'João Silva (Teste)',
  transportadora: 'ACCERT',
  quantidade: 5,
  observacao: 'Teste de ajuste via API',
  dataRecebimento: new Date().toISOString().split('T')[0]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/pallets/ajustes',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testando POST /api/pallets/ajustes...');
console.log('📝 Dados:', postData);

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📝 Resposta:', data);
    try {
      const json = JSON.parse(data);
      console.log('🔍 Resposta parseada:', JSON.stringify(json, null, 2));
    } catch (e) {
      console.log('⚠️ Não foi possível parsear JSON');
    }
  });
});

req.on('error', (error) => {
  console.error('💥 Erro na requisição:', error);
});

req.write(postData);
req.end();
