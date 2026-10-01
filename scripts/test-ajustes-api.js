const fetch = require('node-fetch');

async function testAjustesAPI() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 Testando API de ajustes de pallets...');
  
  try {
    // Teste 1: GET sem autenticação (deve retornar 401)
    console.log('\n1. Testando GET sem autenticação...');
    const response1 = await fetch(`${baseUrl}/api/pallets/ajustes`);
    console.log(`Status: ${response1.status}`);
    const data1 = await response1.json();
    console.log('Resposta:', data1);
    
    if (response1.status === 401) {
      console.log('✅ API está funcionando (retornou 401 como esperado)');
    } else {
      console.log('❌ API não está funcionando como esperado');
    }
    
    // Teste 2: POST sem autenticação (deve retornar 401)
    console.log('\n2. Testando POST sem autenticação...');
    const response2 = await fetch(`${baseUrl}/api/pallets/ajustes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quantidade: 5,
        motorista: 'Teste',
        transportadora: 'ACCERT'
      })
    });
    console.log(`Status: ${response2.status}`);
    const data2 = await response2.json();
    console.log('Resposta:', data2);
    
    if (response2.status === 401) {
      console.log('✅ API está funcionando (retornou 401 como esperado)');
    } else {
      console.log('❌ API não está funcionando como esperado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
    console.log('💡 Certifique-se de que o servidor está rodando em http://localhost:3000');
  }
}

testAjustesAPI();
