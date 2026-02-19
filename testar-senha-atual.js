const bcrypt = require('bcryptjs');

// Hash atual do banco (copiado da saída anterior)
const hashAtual = '$2b$10$fGGYc8Un34eBoLok.PRuyuPkwP1zJ881t8/UZr.GW6nz7kfhh.7lK';

// Senhas para testar
const senhasParaTestar = [
  'adm123',
  'admin123',
  '12345678',
  'admin@esplendor.com',
  'admin',
  'password',
  'senha123'
];

console.log('🔍 Testando senhas contra o hash atual...\n');
console.log(`Hash atual: ${hashAtual}\n`);

let encontrada = false;

for (const senha of senhasParaTestar) {
  try {
    const corresponde = bcrypt.compareSync(senha, hashAtual);
    console.log(`Senha "${senha}": ${corresponde ? '✅ CORRESPONDE' : '❌ NÃO corresponde'}`);
    
    if (corresponde) {
      encontrada = true;
      console.log(`\n🎉 Senha encontrada: "${senha}"`);
    }
  } catch (error) {
    console.log(`Senha "${senha}": ❌ ERRO - ${error.message}`);
  }
}

if (!encontrada) {
  console.log('\n⚠️ Nenhuma das senhas testadas corresponde ao hash.');
  console.log('O hash pode estar corrompido ou usar um algoritmo diferente.');
}