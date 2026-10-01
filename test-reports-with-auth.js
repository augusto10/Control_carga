const axios = require('axios');

async function testReportsWithAuth() {
  const baseURL = 'http://localhost:3000';

  console.log('🔐 Fazendo login para obter token...\n');

  try {
    // Fazer login
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'admin@controlecarga.com',
      senha: '12345678'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true,
      timeout: 10000
    });

    if (loginResponse.status === 200) {
      console.log('✅ Login realizado com sucesso');
      console.log('👤 Usuário:', loginResponse.data.data.nome);

      // Extrair cookies da resposta
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies && cookies.length > 0) {
        console.log('🍪 Cookies recebidos:', cookies.length);

        // Agora testar as APIs de relatórios usando os cookies
        console.log('\n📊 Testando API de relatórios de pallets...');

        try {
          const palletsResponse = await axios.get(`${baseURL}/api/relatorios/pallets`, {
            headers: {
              'Cookie': cookies.join('; ')
            },
            timeout: 10000
          });

          if (palletsResponse.status === 200) {
            console.log('✅ API de pallets funcionando!');
            console.log('📈 Registros retornados:', palletsResponse.data.dados?.length || 0);
          } else {
            console.log(`❌ API de pallets retornou status ${palletsResponse.status}`);
          }
        } catch (palletsError) {
          console.log('❌ Erro na API de pallets:', palletsError.response?.status, palletsError.response?.data?.error || palletsError.message);
        }

        console.log('\n📋 Testando API de relatórios de controles...');

        try {
          const controlesResponse = await axios.get(`${baseURL}/api/relatorios/controles-carga`, {
            headers: {
              'Cookie': cookies.join('; ')
            },
            timeout: 10000
          });

          if (controlesResponse.status === 200) {
            console.log('✅ API de controles funcionando!');
            console.log('📈 Registros retornados:', controlesResponse.data.dados?.length || 0);
          } else {
            console.log(`❌ API de controles retornou status ${controlesResponse.status}`);
          }
        } catch (controlesError) {
          console.log('❌ Erro na API de controles:', controlesError.response?.status, controlesError.response?.data?.error || controlesError.message);
        }

      } else {
        console.log('❌ Nenhum cookie recebido no login');
      }

    } else {
      console.log('❌ Falha no login:', loginResponse.status, loginResponse.data);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Servidor não está rodando');
      console.log('💡 Verifique se o servidor está iniciado: npm run dev');
    } else if (error.response) {
      console.log('❌ Erro na requisição:', error.response.status, error.response.data);
    } else {
      console.log('❌ Erro geral:', error.message);
    }
  }
}

testReportsWithAuth();
