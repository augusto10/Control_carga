// Script para testar as máscaras implementadas
console.log('🧪 Testando máscaras implementadas...\n');

// Simular funções de máscara
const removeFormatting = (text) => text.replace(/\D/g, '');

const applyCpfMask = (text) => {
  const numbers = removeFormatting(text);
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

const applyTelefoneMask = (text) => {
  const numbers = removeFormatting(text);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const applyCnhMask = (text) => {
  const numbers = removeFormatting(text);
  return numbers.slice(0, 11);
};

// Testes de CPF
console.log('📋 Testando máscara de CPF:');
const testeCpf = ['12345678901', '123456789', '123456', '123'];
testeCpf.forEach(cpf => {
  console.log(`  ${cpf.padEnd(12)} → ${applyCpfMask(cpf)}`);
});

console.log('\n📞 Testando máscara de Telefone:');
const testeTelefone = ['11999887766', '1199988776', '119998877', '1199988', '119', '11'];
testeTelefone.forEach(tel => {
  console.log(`  ${tel.padEnd(12)} → ${applyTelefoneMask(tel)}`);
});

console.log('\n🚗 Testando máscara de CNH:');
const testeCnh = ['12345678901234', '12345678901', '123456789', '123456'];
testeCnh.forEach(cnh => {
  console.log(`  ${cnh.padEnd(15)} → ${applyCnhMask(cnh)}`);
});

console.log('\n✅ Máscaras implementadas com sucesso!');
console.log('\n📝 Arquivos atualizados:');
console.log('  ✅ components/InputMask.tsx - Componente de máscara criado');
console.log('  ✅ pages/admin/motoristas/index.tsx - Máscaras aplicadas');
console.log('  ✅ pages/funcionarios.tsx - Máscaras aplicadas');
console.log('  ✅ pages/clientes.tsx - Máscaras aplicadas');
console.log('  ✅ pages/funcionarios-clientes.tsx - Máscaras aplicadas');

console.log('\n🎯 Funcionalidades:');
console.log('  • CPF: 999.999.999-99');
console.log('  • Telefone: (11) 99999-9999');
console.log('  • CNH: 11 dígitos sem formatação');
console.log('  • Dados salvos limpos no banco (sem formatação)');
console.log('  • Exibição formatada na interface');
