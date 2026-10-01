const axios = require('axios');

async function testAPIs() {
  const baseURL = 'http://localhost:3001';

  console.log('🔍 Testando APIs de relatórios...\n');

  try {
    // Teste 1: API de relatórios de pallets
    console.log('📊 Testando /api/relatorios/pallets...');
    try {
      const response = await axios.get(`${baseURL}/api/relatorios/pallets`, {
        timeout: 5000,
        validateStatus: (status) => status < 500 // Aceitar respostas de erro do servidor
      });

      if (response.status === 401) {
        console.log('❌ API de pallets: Não autenticado (401)');
        console.log('💡 Você precisa estar logado para acessar os relatórios');
      } else if (response.status === 200) {
        console.log('✅ API de pallets: Funcionando (200)');
        console.log('📈 Dados retornados:', response.data?.dados?.length || 0, 'registros');
      } else {
        console.log(`❌ API de pallets: Status ${response.status}`);
        console.log('Erro:', response.data?.error || response.data);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ API de pallets: Servidor não está rodando');
        console.log('💡 Execute: npm run dev');
      } else {
        console.log('❌ API de pallets: Erro de conexão -', error.message);
      }
    }

    console.log('');

    // Teste 2: API de relatórios de controles
    console.log('📋 Testando /api/relatorios/controles-carga...');
    try {
      const response = await axios.get(`${baseURL}/api/relatorios/controles-carga`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      if (response.status === 401) {
        console.log('❌ API de controles: Não autenticado (401)');
        console.log('💡 Você precisa estar logado para acessar os relatórios');
      } else if (response.status === 200) {
        console.log('✅ API de controles: Funcionando (200)');
        console.log('📈 Dados retornados:', response.data?.dados?.length || 0, 'registros');
      } else {
        console.log(`❌ API de controles: Status ${response.status}`);
        console.log('Erro:', response.data?.error || response.data);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ API de controles: Servidor não está rodando');
        console.log('💡 Execute: npm run dev');
      } else {
        console.log('❌ API de controles: Erro de conexão -', error.message);
      }
    }

    console.log('');

    // Teste 3: Verificar se o servidor está rodando
    console.log('🌐 Verificando se o servidor está rodando...');
    try {
      const response = await axios.get(`${baseURL}/`, {
        timeout: 3000,
        validateStatus: () => true
      });

      if (response.status === 200) {
        console.log('✅ Servidor Next.js está rodando na porta 3001');
      } else {
        console.log(`⚠️ Servidor respondeu com status ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Servidor não está rodando');
        console.log('💡 Execute este comando: npm run dev');
      } else {
        console.log('❌ Erro ao conectar com o servidor:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testAPIs();
