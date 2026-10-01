const axios = require('axios');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuração do cliente HTTP que ignora certificados auto-assinados (apenas para desenvolvimento)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Apenas para desenvolvimento local
});

const API_URL = 'http://localhost:3000/api';

// Função para testar o login
async function testLogin() {
  try {
    console.log('=== TESTE DE AUTENTICAÇÃO ===');
    
    // 1. Fazer login
    console.log('\n1. Fazendo login...');
    const loginResponse = await axios.post(
      `${API_URL}/auth/login`,
      {
        email: 'admin@example.com', // Substitua por um usuário válido
        senha: 'senha123'          // Substitua pela senha correta
      },
      {
        httpsAgent,
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Resposta do login:', {
      status: loginResponse.status,
      data: {
        ...loginResponse.data,
        token: loginResponse.data.token ? '***TOKEN_REDACTED***' : 'N/A'
      },
      headers: loginResponse.headers,
      cookies: loginResponse.headers['set-cookie'] || []
    });

    // Extrair cookies da resposta
    const cookies = loginResponse.headers['set-cookie'] || [];
    
    if (cookies.length === 0) {
      throw new Error('Nenhum cookie de autenticação retornado');
    }

    console.log('\n2. Acessando endpoint protegido...');
    
    // 2. Acessar endpoint protegido com os cookies
    const rankingResponse = await axios.get(
      `${API_URL}/gamificacao/ranking`,
      {
        httpsAgent,
        withCredentials: true,
        headers: {
          Cookie: cookies.join('; '),
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\nResposta do endpoint protegido:', {
      status: rankingResponse.status,
      data: rankingResponse.data,
      headers: rankingResponse.headers
    });

    console.log('\n=== TESTE CONCLUÍDO COM SUCESSO ===');
    return true;
  } catch (error) {
    console.error('\n=== ERRO NO TESTE ===');
    
    if (error.response) {
      // A requisição foi feita e o servidor respondeu com um status fora do intervalo 2xx
      console.error('Erro na resposta:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        config: {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers,
          data: error.config.data
        }
      });
    } else if (error.request) {
      // A requisição foi feita mas não houve resposta
      console.error('Sem resposta do servidor:', error.request);
    } else {
      // Algo aconteceu na configuração da requisição que causou um erro
      console.error('Erro ao configurar a requisição:', error.message);
    }
    
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// Executar o teste
if (require.main === module) {
  testLogin().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testLogin };
