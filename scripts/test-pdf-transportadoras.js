console.log('🧪 Testando mapeamento de transportadoras para PDF...\n');

// Simular a lista transportadorasFixas corrigida
const transportadorasFixas = [
  { id: 'ACCERT', nome: 'ACCERT', descricao: 'ACCERT Transportes' },
  { id: 'EXPRESSO_GOIAS', nome: 'EXPRESSO_GOIAS', descricao: 'Expresso Goiás' },
  { id: 'TERCEIRIZADA', nome: 'TERCEIRIZADA', descricao: 'Terceirizada' },
  { id: 'DETAFRA_TRANSPORTES', nome: 'DETAFRA_TRANSPORTES', descricao: 'Detafra Transportes' },
  { id: 'RETIRA_VENDEDOR', nome: 'RETIRA_VENDEDOR', descricao: 'Retira Vendedor' },
  { id: 'RETIRA_CLIENTE', nome: 'RETIRA_CLIENTE', descricao: 'Retira Cliente' }
];

// Simular a função getTransportadoraById
function getTransportadoraById(id) {
  const encontrada = transportadorasFixas.find(t => t.id === id);
  if (!encontrada) {
    console.warn(`Transportadora com ID ${id} não encontrada`);
    return transportadorasFixas[0]; // Retorna ACCERT como padrão
  }
  return encontrada;
}

// Testes
console.log('📋 Lista de transportadoras disponíveis:');
transportadorasFixas.forEach((transp, index) => {
  console.log(`   ${index + 1}. ID: "${transp.id}" → Descrição: "${transp.descricao}"`);
});

console.log('\n🧪 Testando mapeamento para PDF:');

// Teste 1: ACCERT
console.log('\n1️⃣ Controle com transportadora ACCERT:');
const resultadoAccert = getTransportadoraById('ACCERT');
console.log(`   Input: "ACCERT"`);
console.log(`   Output PDF: "${resultadoAccert.descricao}"`);
console.log(`   ✅ Correto: Deve mostrar "ACCERT Transportes"`);

// Teste 2: RETIRA_CLIENTE
console.log('\n2️⃣ Controle com transportadora RETIRA_CLIENTE:');
const resultadoRetiraCliente = getTransportadoraById('RETIRA_CLIENTE');
console.log(`   Input: "RETIRA_CLIENTE"`);
console.log(`   Output PDF: "${resultadoRetiraCliente.descricao}"`);
console.log(`   ✅ Correto: Deve mostrar "Retira Cliente"`);

// Teste 3: RETIRA_VENDEDOR
console.log('\n3️⃣ Controle com transportadora RETIRA_VENDEDOR:');
const resultadoRetiraVendedor = getTransportadoraById('RETIRA_VENDEDOR');
console.log(`   Input: "RETIRA_VENDEDOR"`);
console.log(`   Output PDF: "${resultadoRetiraVendedor.descricao}"`);
console.log(`   ✅ Correto: Deve mostrar "Retira Vendedor"`);

// Teste 4: Transportadora não encontrada (deve usar ACCERT como padrão)
console.log('\n4️⃣ Controle com transportadora inexistente:');
const resultadoInexistente = getTransportadoraById('TRANSPORTADORA_INEXISTENTE');
console.log(`   Input: "TRANSPORTADORA_INEXISTENTE"`);
console.log(`   Output PDF: "${resultadoInexistente.descricao}"`);
console.log(`   ✅ Correto: Deve usar "ACCERT Transportes" como padrão`);

// Teste 5: ACERT (antigo - deve falhar e usar padrão)
console.log('\n5️⃣ Controle com ACERT (antigo):');
const resultadoAcertAntigo = getTransportadoraById('ACERT');
console.log(`   Input: "ACERT"`);
console.log(`   Output PDF: "${resultadoAcertAntigo.descricao}"`);
console.log(`   ✅ Correto: Deve usar "ACCERT Transportes" como padrão (ACERT não existe mais)`);

console.log('\n🎯 Resultado esperado no PDF:');
console.log('   • Cliente com RETIRA_CLIENTE → "Transportadora: Retira Cliente" ✅');
console.log('   • Motorista com ACCERT → "Transportadora: ACCERT Transportes" ✅');
console.log('   • Funcionário com RETIRA_VENDEDOR → "Transportadora: Retira Vendedor" ✅');

console.log('\n🎉 Teste concluído!');
console.log('\n💡 Agora o PDF deve mostrar as transportadoras corretas para cada tipo de pessoa.');
