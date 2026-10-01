const axios = require('axios');

async function testarCriarMotorista() {
  try {
    console.log('🧪 Testando criação de motorista...');
    
    // Dados de teste
    const dadosMotorista = {
      nome: 'Teste Motorista',
      telefone: '(11) 99999-9999',
      cpf: '12345678901',
      cnh: '12345678901',
      transportadoraId: 'ACCERT'
    };
    
    console.log('📤 Enviando dados:', dadosMotorista);
    
    // Fazer requisição POST
    const response = await axios.post('http://localhost:3000/api/motoristas', dadosMotorista, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('✅ Sucesso! Status:', response.status);
    console.log('📋 Resposta:', response.data);
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.status, error.response?.statusText);
    console.error('📋 Detalhes:', error.response?.data);
    console.error('🔍 Erro completo:', error.message);
  }
}

testarCriarMotorista();
