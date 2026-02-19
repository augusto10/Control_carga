const fetch = require('node-fetch');

async function testApiReal() {
  try {
    console.log('🧪 Testando API real /api/pessoas/para-controles...\n');

    const response = await fetch('http://localhost:3000/api/pessoas/para-controles', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Simular cookie de autenticação se necessário
      }
    });

    if (!response.ok) {
      console.error(`❌ Erro na API: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Resposta:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API respondeu com sucesso!');
    console.log(`📊 Total de pessoas: ${data.total}\n`);

    // Verificar estrutura dos dados
    console.log('🔍 Estrutura dos dados:');
    if (data.todas && data.todas.length > 0) {
      const primeira = data.todas[0];
      console.log('Primeira pessoa:', JSON.stringify(primeira, null, 2));
    }

    // Verificar agrupamento
    console.log('\n📋 Agrupamento:');
    if (data.agrupadas) {
      console.log(`🚛 Motoristas: ${data.agrupadas.motoristas?.length || 0}`);
      console.log(`👨‍💼 Funcionários: ${data.agrupadas.funcionarios?.length || 0}`);
      console.log(`🏢 Clientes: ${data.agrupadas.clientes?.length || 0}`);
    }

    // Verificar transportadoras específicas
    console.log('\n🚚 Verificando transportadoras específicas:');
    
    const accertPessoas = data.todas.filter(p => p.transportadoraId === 'ACCERT');
    console.log(`ACCERT: ${accertPessoas.length} pessoas`);
    accertPessoas.forEach(p => {
      console.log(`   - ${p.nome} (${p.tipoLabel})`);
    });

    const retiraClientePessoas = data.todas.filter(p => p.transportadoraId === 'RETIRA_CLIENTE');
    console.log(`RETIRA_CLIENTE: ${retiraClientePessoas.length} pessoas`);
    retiraClientePessoas.forEach(p => {
      console.log(`   - ${p.nome} (${p.tipoLabel})`);
    });

    console.log('\n🎯 Dados que o componente receberá:');
    data.todas.slice(0, 5).forEach((pessoa, index) => {
      console.log(`${index + 1}. ${pessoa.displayName}`);
      console.log(`   ID: ${pessoa.id}`);
      console.log(`   Transportadora: ${pessoa.transportadoraId}`);
      console.log(`   Tipo: ${pessoa.tipo}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

testApiReal();
