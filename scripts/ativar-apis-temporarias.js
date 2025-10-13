const fs = require('fs');
const path = require('path');

console.log('🔄 Ativando APIs temporárias para compatibilidade...');

// Fazer backup das APIs originais e ativar as temporárias
const apis = [
  {
    original: 'pages/api/pessoas/index.ts',
    temp: 'pages/api/pessoas/index-temp.ts',
    backup: 'pages/api/pessoas/index.original.ts'
  },
  {
    original: 'pages/api/pessoas/para-controles.ts', 
    temp: 'pages/api/pessoas/para-controles-temp.ts',
    backup: 'pages/api/pessoas/para-controles.original.ts'
  }
];

apis.forEach(api => {
  try {
    // Fazer backup da API original se existir
    if (fs.existsSync(api.original)) {
      console.log(`📋 Fazendo backup: ${api.original} → ${api.backup}`);
      fs.copyFileSync(api.original, api.backup);
    }
    
    // Ativar API temporária
    if (fs.existsSync(api.temp)) {
      console.log(`🔄 Ativando temporária: ${api.temp} → ${api.original}`);
      fs.copyFileSync(api.temp, api.original);
    } else {
      console.log(`⚠️ API temporária não encontrada: ${api.temp}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao processar ${api.original}:`, error.message);
  }
});

console.log('✅ APIs temporárias ativadas!');
console.log('💡 Execute a migração do banco e depois rode: node scripts/restaurar-apis-originais.js');
