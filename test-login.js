const axios = require('axios');

async function testLogin() {
  try {
    console.log('🔍 Testando login...');

    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'augusto@esplendor.com',
      senha: 'augusto123'
    });

    console.log('✅ Login bem-sucedido!');
    console.log('Status:', response.status);
    console.log('Headers:', response.headers);
    console.log('Cookies:', response.headers['set-cookie']);

  } catch (error) {
    console.error('❌ Erro no login:');
    console.error('Status:', error.response?.status);
    console.error('Mensagem:', error.response?.data);
    console.error('Stack:', error.stack);
  }
}

testLogin();
