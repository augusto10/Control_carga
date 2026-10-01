// Teste simples de login
const http = require('http');

const postData = JSON.stringify({
  email: 'admin@controlecarga.com',
  senha: '12345678'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔐 Testando login...');

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`🍪 Set-Cookie:`, res.headers['set-cookie']);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📝 Resposta:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Login bem-sucedido!');
      
      // Extrair o cookie
      const setCookieHeader = res.headers['set-cookie'];
      if (setCookieHeader && setCookieHeader.length > 0) {
        const authCookie = setCookieHeader[0];
        console.log('🍪 Cookie de autenticação:', authCookie);
        
        // Testar ajuste com o cookie
        testarAjusteComCookie(authCookie);
      } else {
        console.log('❌ Nenhum cookie de autenticação encontrado');
      }
    } else {
      console.log('❌ Falha no login');
    }
  });
});

req.on('error', (error) => {
  console.error('💥 Erro na requisição:', error);
});

req.write(postData);
req.end();

function testarAjusteComCookie(cookie) {
  console.log('\n🧪 Testando ajuste com cookie...');
  
  const ajusteData = JSON.stringify({
    motorista: 'João Silva (Teste)',
    transportadora: 'ACCERT',
    quantidade: 5,
    observacao: 'Teste com cookie',
    dataRecebimento: new Date().toISOString().split('T')[0]
  });

  const ajusteOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/pallets/ajustes',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(ajusteData),
      'Cookie': cookie
    }
  };

  const ajusteReq = http.request(ajusteOptions, (res) => {
    console.log(`📊 Status ajuste: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📝 Resposta ajuste:', data);
      
      if (res.statusCode === 201) {
        console.log('✅ Ajuste salvo com sucesso!');
      } else if (res.statusCode === 503) {
        console.log('⚠️ Funcionalidade indisponível (tabela não existe)');
      } else {
        console.log('❌ Erro ao salvar ajuste');
      }
    });
  });

  ajusteReq.on('error', (error) => {
    console.error('💥 Erro na requisição de ajuste:', error);
  });

  ajusteReq.write(ajusteData);
  ajusteReq.end();
}
