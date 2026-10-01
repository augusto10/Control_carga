const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo erro de sintaxe simples...\n');

const filePath = path.join(__dirname, '..', 'components', 'ListarControlesContent.tsx');

try {
  // Ler o arquivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📄 Arquivo lido com sucesso');
  
  // Substituir todas as ocorrências de }}} por }}
  const originalContent = content;
  content = content.replace(/\}\}\}/g, '}}');
  
  const correcoes = (originalContent.match(/\}\}\}/g) || []).length;
  
  if (correcoes > 0) {
    console.log(`✅ ${correcoes} erro(s) de '}}}' corrigido(s) para '}}'`);
  } else {
    console.log('ℹ️ Nenhum erro de '}}}' encontrado');
  }
  
  // Escrever o arquivo corrigido
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Arquivo salvo com sucesso!');
  
  console.log('\n🎯 Correção implementada:');
  console.log('   ✅ Todos os '}}}' foram corrigidos para '}}'');
  console.log('   ✅ Arquivo deve compilar normalmente agora');
  
  console.log('\n🚀 Tente executar o projeto novamente!');

} catch (error) {
  console.error('❌ Erro ao processar arquivo:', error);
}
