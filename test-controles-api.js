const axios = require('axios');

async function testControlesAPI() {
  try {
    console.log('🔍 Testando API de controles...');

    // Primeiro fazer login para obter o token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'augusto@esplendor.com',
      senha: 'augusto123'
    });

    const cookies = loginResponse.headers['set-cookie'];
    const authCookie = cookies.find(cookie => cookie.startsWith('auth_token='));

    console.log('✅ Login realizado, cookie obtido');

    // Agora testar a API de controles com o cookie
    const controlesResponse = await axios.get('http://localhost:3000/api/controles', {
      headers: {
        'Cookie': authCookie
      }
    });

    console.log('✅ API de controles funcionando!');
    console.log('Status:', controlesResponse.status);
    console.log('Total de controles:', controlesResponse.data.length);

  } catch (error) {
    console.error('❌ Erro na API de controles:');
    console.error('Status:', error.response?.status);
    console.error('Mensagem:', error.response?.data);
  }
}

testControlesAPI();
