const fs = require('fs');
const path = require('path');

console.log('🔄 Restaurando APIs originais após migração...');

// Restaurar APIs originais dos backups
const apis = [
  {
    original: 'pages/api/pessoas/index.ts',
    backup: 'pages/api/pessoas/index.original.ts'
  },
  {
    original: 'pages/api/pessoas/para-controles.ts',
    backup: 'pages/api/pessoas/para-controles.original.ts'
  }
];

apis.forEach(api => {
  try {
    // Restaurar da backup se existir
    if (fs.existsSync(api.backup)) {
      console.log(`📋 Restaurando: ${api.backup} → ${api.original}`);
      fs.copyFileSync(api.backup, api.original);
      
      // Remover backup
      fs.unlinkSync(api.backup);
      console.log(`🗑️ Backup removido: ${api.backup}`);
    } else {
      console.log(`⚠️ Backup não encontrado: ${api.backup}`);
    }
  } catch (error) {
    console.error(`❌ Erro ao restaurar ${api.original}:`, error.message);
  }
});

console.log('✅ APIs originais restauradas!');
console.log('🚀 Sistema deve funcionar normalmente com campo "tipo"');
