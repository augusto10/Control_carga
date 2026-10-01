console.log('🧪 Testando validação do store...\n');

// Simular a validação do store
function validarTransportadora(transportadora) {
  const transportadorasValidas = ['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE'];
  
  console.log(`Testando transportadora: "${transportadora}"`);
  
  if (!transportadorasValidas.includes(transportadora)) {
    console.log(`❌ Transportadora inválida: ${transportadora}`);
    return false;
  } else {
    console.log(`✅ Transportadora válida: ${transportadora}`);
    return true;
  }
}

// Testes
console.log('1️⃣ Testando ACCERT:');
validarTransportadora('ACCERT');

console.log('\n2️⃣ Testando RETIRA_CLIENTE:');
validarTransportadora('RETIRA_CLIENTE');

console.log('\n3️⃣ Testando RETIRA_VENDEDOR:');
validarTransportadora('RETIRA_VENDEDOR');

console.log('\n4️⃣ Testando ACERT (antigo - deve falhar):');
validarTransportadora('ACERT');

console.log('\n5️⃣ Testando EXPRESSO_GOIAS:');
validarTransportadora('EXPRESSO_GOIAS');

console.log('\n6️⃣ Testando transportadora inválida:');
validarTransportadora('TRANSPORTADORA_INEXISTENTE');

console.log('\n📋 Lista de transportadoras válidas no store:');
const transportadorasValidas = ['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE'];
transportadorasValidas.forEach((transp, index) => {
  console.log(`   ${index + 1}. ${transp}`);
});

console.log('\n🎉 Teste concluído!');
console.log('\n💡 Agora o store deve aceitar ACCERT e RETIRA_CLIENTE sem erro.');
