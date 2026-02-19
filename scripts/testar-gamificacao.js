// Script para testar a funcionalidade de gamificação
// Executar: node scripts/testar-gamificacao.js

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testarGamificacao() {
  console.log('🎮 Iniciando testes de gamificação...\n');

  try {
    // Testar buscar ranking
    console.log('📊 Testando buscar ranking...');
    const rankingResponse = await axios.get(`${API_BASE}/gamificacao/ranking`);
    console.log('Ranking:', rankingResponse.data.ranking);
    console.log('✅ Buscar ranking OK\n');

    // Testar registrar pontuação positiva
    console.log('➕ Testando registrar pontuação positiva...');
    const pontuacaoPositiva = await axios.post(`${API_BASE}/gamificacao/registrar-pontuacao`, {
      usuarioId: 'teste-usuario-1',
      pedidoId: 'teste-pedido-1',
      acao: 'PEDIDO_CORRETO',
      pontos: 10,
      descricao: 'Teste de pontuação positiva'
    });
    console.log('Pontuação registrada:', pontuacaoPositiva.data);
    console.log('✅ Pontuação positiva OK\n');

    // Testar registrar pontuação negativa
    console.log('➖ Testando registrar pontuação negativa...');
    const pontuacaoNegativa = await axios.post(`${API_BASE}/gamificacao/registrar-pontuacao`, {
      usuarioId: 'teste-usuario-1',
      pedidoId: 'teste-pedido-2',
      acao: 'PEDIDO_INCORRETO',
      pontos: -5,
      descricao: 'Teste de pontuação negativa'
    });
    console.log('Pontuação registrada:', pontuacaoNegativa.data);
    console.log('✅ Pontuação negativa OK\n');

    // Testar buscar histórico
    console.log('📋 Testando buscar histórico...');
    const historicoResponse = await axios.get(`${API_BASE}/gamificacao/historico?usuarioId=teste-usuario-1`);
    console.log('Histórico:', historicoResponse.data.historico);
    console.log('✅ Buscar histórico OK\n');

    // Testar registrar separação
    console.log('📦 Testando registrar separação...');
    const separacaoResponse = await axios.post(`${API_BASE}/gamificacao/registrar-separacao`, {
      pedidoId: 'teste-pedido-3',
      correto: true
    });
    console.log('Separação registrada:', separacaoResponse.data);
    console.log('✅ Registrar separação OK\n');

    console.log('🎉 Todos os testes de gamificação foram concluídos com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante testes:', error.response?.data || error.message);
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  testarGamificacao();
}

module.exports = { testarGamificacao };
