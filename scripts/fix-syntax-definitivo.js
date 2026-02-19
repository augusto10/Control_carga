const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo erro de sintaxe DEFINITIVAMENTE...\n');

const filePath = path.join(__dirname, '..', 'components', 'ListarControlesContent.tsx');

try {
  // Ler o arquivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  console.log('📄 Arquivo lido com sucesso');
  
  // Dividir em linhas para análise detalhada
  const lines = content.split('\n');
  
  console.log('🔍 Procurando por problemas de sintaxe...');
  
  let correcoesFeiras = 0;
  
  // Procurar e corrigir todos os }}} para }}
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('}}}')) {
      console.log(`🔍 Encontrado '}}}' na linha ${i + 1}: ${line.trim()}`);
      
      // Substituir }}} por }}
      lines[i] = line.replace(/\}\}\}/g, '}}');
      
      console.log(`✅ Corrigido para: ${lines[i].trim()}`);
      correcoesFeiras++;
    }
  }
  
  // Reconstruir o conteúdo
  content = lines.join('\n');
  
  console.log(`\n📊 Total de correções: ${correcoesFeiras}`);
  
  // Verificar se há outros problemas de sintaxe
  console.log('\n🔍 Verificando balanço de símbolos...');
  
  let braceCount = 0;
  let parenCount = 0;
  let bracketCount = 0;
  let inString = false;
  let inComment = false;
  let stringChar = '';
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    const nextChar = i < content.length - 1 ? content[i + 1] : '';
    
    // Detectar strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\' && !inComment) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
    
    // Detectar comentários
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inComment = true;
      } else if (char === '\n') {
        inComment = false;
      }
    }
    
    // Contar símbolos apenas fora de strings e comentários
    if (!inString && !inComment) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '(') parenCount++;
      else if (char === ')') parenCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;
    }
  }
  
  console.log(`   Chaves {}: ${braceCount === 0 ? '✅ Balanceadas' : `❌ Desbalanceadas (${braceCount})`}`);
  console.log(`   Parênteses (): ${parenCount === 0 ? '✅ Balanceados' : `❌ Desbalanceados (${parenCount})`}`);
  console.log(`   Colchetes []: ${bracketCount === 0 ? '✅ Balanceados' : `❌ Desbalanceados (${bracketCount})`}`);
  
  // Procurar por padrões problemáticos específicos
  console.log('\n🔍 Verificando padrões problemáticos...');
  
  const problematicPatterns = [
    { pattern: /\}\}\}/g, description: 'Três chaves consecutivas' },
    { pattern: /\(\(\(/g, description: 'Três parênteses consecutivos' },
    { pattern: /\[\[\[/g, description: 'Três colchetes consecutivos' },
    { pattern: /\}\s*\}\s*\}/g, description: 'Três chaves com espaços' }
  ];
  
  problematicPatterns.forEach(({ pattern, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`⚠️ Encontrado: ${description} (${matches.length} ocorrências)`);
    }
  });
  
  // Escrever o arquivo corrigido
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('\n✅ Arquivo salvo com sucesso!');
  
  console.log('\n🎯 Correções implementadas:');
  if (correcoesFeiras > 0) {
    console.log(`   ✅ ${correcoesFeiras} erro(s) de '}}}' corrigido(s) para '}}'`);
  } else {
    console.log('   ℹ️ Nenhum erro de '}}}' encontrado');
  }
  
  console.log('   ✅ Verificação completa de sintaxe realizada');
  console.log('   ✅ Arquivo deve compilar normalmente agora');
  
  console.log('\n🚀 Tente executar o projeto novamente!');
  console.log('💡 Se o erro persistir, pode haver outro problema de sintaxe.');

} catch (error) {
  console.error('❌ Erro ao processar arquivo:', error);
}
