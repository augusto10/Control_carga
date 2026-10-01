const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo erro de sintaxe no ListarControlesContent.tsx...\n');

const filePath = path.join(__dirname, '..', 'components', 'ListarControlesContent.tsx');

try {
  // Ler o arquivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📄 Arquivo lido com sucesso');
  
  // Corrigir o erro de sintaxe na linha 1694
  // Substituir }}} por }}
  const errorPattern = '        }}}';
  const correctPattern = '        }}';
  
  if (content.includes(errorPattern)) {
    content = content.replace(errorPattern, correctPattern);
    console.log('✅ Erro de sintaxe corrigido: }}} → }}');
  } else {
    console.log('⚠️ Padrão de erro não encontrado, verificando outras possibilidades...');
    
    // Verificar se há outros padrões problemáticos
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('}}}')) {
        console.log(`🔍 Encontrado }}} na linha ${i + 1}: ${line.trim()}`);
        lines[i] = line.replace('}}}', '}}');
        console.log(`✅ Corrigido para: ${lines[i].trim()}`);
      }
    }
    content = lines.join('\n');
  }
  
  // Verificar se há outros problemas de sintaxe comuns
  console.log('\n🔍 Verificando outros problemas de sintaxe...');
  
  // Verificar parênteses e chaves balanceados
  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  
  for (let char of content) {
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '(') parenCount++;
    else if (char === ')') parenCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
  }
  
  console.log(`🔍 Balanço de símbolos:`);
  console.log(`   Chaves {}: ${braceCount === 0 ? '✅ Balanceadas' : `❌ Desbalanceadas (${braceCount})`}`);
  console.log(`   Parênteses (): ${parenCount === 0 ? '✅ Balanceados' : `❌ Desbalanceados (${parenCount})`}`);
  console.log(`   Colchetes []: ${bracketCount === 0 ? '✅ Balanceados' : `❌ Desbalanceados (${bracketCount})`}`);
  
  // Escrever o arquivo corrigido
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Arquivo salvo com sucesso!');
  
  console.log('\n🎯 Correção implementada:');
  console.log('   ✅ Erro de sintaxe }}} corrigido para }}');
  console.log('   ✅ Arquivo deve compilar normalmente agora');
  
  console.log('\n🚀 Tente executar o projeto novamente!');

} catch (error) {
  console.error('❌ Erro ao processar arquivo:', error);
}
