const axios = require('axios');

async function testarOrdenacaoPessoas() {
  try {
    console.log('🧪 Testando ordenação de pessoas por tipo...\n');
    
    // Fazer requisição para a API
    const response = await axios.get('http://localhost:3000/api/pessoas/para-controles', {
      withCredentials: true,
      headers: {
        'Cookie': 'auth-token=seu_token_aqui' // Substitua pelo token real se necessário
      }
    });
    
    const { todas, agrupadas, total } = response.data;
    
    console.log(`📊 Total de pessoas: ${total}\n`);
    
    console.log('🎯 Ordenação por tipo:');
    console.log(`  🚛 Motoristas: ${agrupadas.motoristas.length}`);
    console.log(`  👨‍💼 Funcionários: ${agrupadas.funcionarios.length}`);
    console.log(`  🏢 Clientes: ${agrupadas.clientes.length}\n`);
    
    console.log('📋 Lista ordenada (primeiros 10):');
    todas.slice(0, 10).forEach((pessoa, index) => {
      const tipoIcon = pessoa.tipo === 'MOTORISTA' ? '🚛' : 
                      pessoa.tipo === 'FUNCIONARIO' ? '👨‍💼' : '🏢';
      console.log(`  ${(index + 1).toString().padStart(2)}. ${tipoIcon} ${pessoa.nome} (${pessoa.tipoLabel})`);
    });
    
    // Verificar se a ordenação está correta
    let ordemCorreta = true;
    const ordemTipos = { 'MOTORISTA': 1, 'FUNCIONARIO': 2, 'CLIENTE': 3 };
    
    for (let i = 1; i < todas.length; i++) {
      const anterior = todas[i - 1];
      const atual = todas[i];
      
      const tipoAnterior = ordemTipos[anterior.tipo];
      const tipoAtual = ordemTipos[atual.tipo];
      
      if (tipoAnterior > tipoAtual) {
        ordemCorreta = false;
        console.log(`❌ Erro na ordenação: ${anterior.nome} (${anterior.tipo}) vem antes de ${atual.nome} (${atual.tipo})`);
        break;
      }
      
      // Se mesmo tipo, verificar ordem alfabética
      if (tipoAnterior === tipoAtual && anterior.nome > atual.nome) {
        ordemCorreta = false;
        console.log(`❌ Erro na ordenação alfabética: ${anterior.nome} vem antes de ${atual.nome} no mesmo tipo`);
        break;
      }
    }
    
    if (ordemCorreta) {
      console.log('\n✅ Ordenação está correta!');
      console.log('   1º Motoristas (ordem alfabética)');
      console.log('   2º Funcionários (ordem alfabética)');
      console.log('   3º Clientes (ordem alfabética)');
    }
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('⚠️  Erro de autenticação - Execute o teste com usuário logado');
      console.log('   Acesse http://localhost:3000/login primeiro');
    } else {
      console.error('❌ Erro:', error.response?.status, error.response?.statusText);
      console.error('📋 Detalhes:', error.response?.data);
    }
  }
}

testarOrdenacaoPessoas();
