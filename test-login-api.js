// test-login-api.js
// Teste direto da API de login

const axios = require('axios');

async function testLoginAPI() {
  console.log('=== TESTE DA API DE LOGIN ===');
  
  const loginData = {
    email: 'suporte@esplendoratacadista.com.br',
    senha: 'suporteadmin'
  };
  
  console.log('📡 Enviando requisição de login...');
  console.log('📧 Email:', loginData.email);
  console.log('🔑 Senha:', '***');
  
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      withCredentials: true,
      timeout: 10000
    });
    
    console.log('✅ Login bem-sucedido!');
    console.log('Status:', response.status);
    console.log('Dados do usuário:', response.data.data);
    console.log('Cookie de autenticação:', response.headers['set-cookie'] ? '***CONFIGURADO***' : 'NÃO CONFIGURADO');
    
  } catch (error) {
    console.error('❌ Erro no login:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Dados do erro:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('Erro de rede:', error.message);
    } else {
      console.error('Erro desconhecido:', error.message);
    }
  }
}

testLoginAPI();
