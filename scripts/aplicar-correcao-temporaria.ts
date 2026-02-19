import * as fs from 'fs';
import * as path from 'path';

// Script para aplicar correção temporária nas APIs problemáticas
async function aplicarCorrecaoTemporaria() {
  console.log('🔄 [CORREÇÃO] Aplicando correção temporária para APIs...');
  
  const projectRoot = path.join(__dirname, '..');
  
  try {
    // 1. Backup das APIs originais
    console.log('📦 [CORREÇÃO] Fazendo backup das APIs originais...');
    
    const motoristasOriginal = path.join(projectRoot, 'pages/api/motoristas/index.ts');
    const motoristasBackup = path.join(projectRoot, 'pages/api/motoristas/index.original.ts');
    
    const notasOriginal = path.join(projectRoot, 'pages/api/notas/index.ts');
    const notasBackup = path.join(projectRoot, 'pages/api/notas/index.original.ts');
    
    // Fazer backup se não existir
    if (fs.existsSync(motoristasOriginal) && !fs.existsSync(motoristasBackup)) {
      fs.copyFileSync(motoristasOriginal, motoristasBackup);
      console.log('✅ [CORREÇÃO] Backup de motoristas/index.ts criado');
    }
    
    if (fs.existsSync(notasOriginal) && !fs.existsSync(notasBackup)) {
      fs.copyFileSync(notasOriginal, notasBackup);
      console.log('✅ [CORREÇÃO] Backup de notas/index.ts criado');
    }
    
    // 2. Substituir pelas versões temporárias
    console.log('🔄 [CORREÇÃO] Substituindo APIs pelas versões temporárias...');
    
    const motoristasTemp = path.join(projectRoot, 'pages/api/motoristas/index-temp.ts');
    const notasTemp = path.join(projectRoot, 'pages/api/notas/index-temp.ts');
    
    if (fs.existsSync(motoristasTemp)) {
      fs.copyFileSync(motoristasTemp, motoristasOriginal);
      console.log('✅ [CORREÇÃO] API motoristas substituída pela versão temporária');
    }
    
    if (fs.existsSync(notasTemp)) {
      fs.copyFileSync(notasTemp, notasOriginal);
      console.log('✅ [CORREÇÃO] API notas substituída pela versão temporária');
    }
    
    // 3. Criar arquivo de status
    const statusFile = path.join(projectRoot, 'CORRECAO_TEMPORARIA_APLICADA.md');
    const statusContent = `# CORREÇÃO TEMPORÁRIA APLICADA

## Status: ATIVO

As seguintes APIs foram substituídas por versões temporárias compatíveis com o schema antigo do banco de produção:

### APIs Corrigidas:
- \`/api/motoristas\` → Versão compatível sem campo \`tipo\`
- \`/api/notas\` → Versão compatível com enum antigo

### Problemas Resolvidos:
1. **Erro P2022**: Campo \`Motorista.tipo\` não existe
2. **Erro enum**: Valor 'ACERT' não encontrado no enum 'Transportadora'

### Backups Criados:
- \`pages/api/motoristas/index.original.ts\`
- \`pages/api/notas/index.original.ts\`

### Para Reverter:
\`\`\`bash
npm run reverter-correcao-temporaria
\`\`\`

### Para Aplicar Migração Definitiva:
\`\`\`bash
npm run migration-producao
\`\`\`

---
**Data de Aplicação**: ${new Date().toISOString()}
**Ambiente**: Produção (Vercel)
`;
    
    fs.writeFileSync(statusFile, statusContent);
    console.log('✅ [CORREÇÃO] Arquivo de status criado');
    
    console.log('🎉 [CORREÇÃO] Correção temporária aplicada com sucesso!');
    console.log('');
    console.log('📋 [CORREÇÃO] Próximos passos:');
    console.log('1. Fazer commit e push das alterações');
    console.log('2. Aguardar deploy automático no Vercel');
    console.log('3. Testar as APIs corrigidas');
    console.log('4. Executar migração definitiva quando possível');
    
  } catch (error) {
    console.error('❌ [CORREÇÃO] Erro ao aplicar correção temporária:', error);
    throw error;
  }
}

// Função para reverter a correção
async function reverterCorrecaoTemporaria() {
  console.log('🔄 [REVERTER] Revertendo correção temporária...');
  
  const projectRoot = path.join(__dirname, '..');
  
  try {
    const motoristasOriginal = path.join(projectRoot, 'pages/api/motoristas/index.ts');
    const motoristasBackup = path.join(projectRoot, 'pages/api/motoristas/index.original.ts');
    
    const notasOriginal = path.join(projectRoot, 'pages/api/notas/index.ts');
    const notasBackup = path.join(projectRoot, 'pages/api/notas/index.original.ts');
    
    // Restaurar backups
    if (fs.existsSync(motoristasBackup)) {
      fs.copyFileSync(motoristasBackup, motoristasOriginal);
      fs.unlinkSync(motoristasBackup);
      console.log('✅ [REVERTER] API motoristas restaurada');
    }
    
    if (fs.existsSync(notasBackup)) {
      fs.copyFileSync(notasBackup, notasOriginal);
      fs.unlinkSync(notasBackup);
      console.log('✅ [REVERTER] API notas restaurada');
    }
    
    // Remover arquivo de status
    const statusFile = path.join(projectRoot, 'CORRECAO_TEMPORARIA_APLICADA.md');
    if (fs.existsSync(statusFile)) {
      fs.unlinkSync(statusFile);
      console.log('✅ [REVERTER] Arquivo de status removido');
    }
    
    console.log('🎉 [REVERTER] Correção temporária revertida com sucesso!');
    
  } catch (error) {
    console.error('❌ [REVERTER] Erro ao reverter correção:', error);
    throw error;
  }
}

// Executar baseado no argumento
const acao = process.argv[2];

if (acao === 'reverter') {
  reverterCorrecaoTemporaria()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  aplicarCorrecaoTemporaria()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { aplicarCorrecaoTemporaria, reverterCorrecaoTemporaria };
