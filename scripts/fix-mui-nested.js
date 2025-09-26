const fs = require('fs');
const path = require('path');

function ensureMuiNestedFile() {
  const projectRoot = path.resolve(__dirname, '..');
  const baseDir = path.join(projectRoot, 'node_modules', '@mui', 'private-theming');
  const sourceFile = path.join(baseDir, 'ThemeProvider', 'nested.js');
  const targetDir = path.join(baseDir, 'node', 'ThemeProvider');
  const targetFile = path.join(targetDir, 'nested.js');

  try {
    if (!fs.existsSync(sourceFile)) {
      console.warn('[fix-mui-nested] Arquivo de origem não encontrado:', sourceFile);
      return;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.copyFileSync(sourceFile, targetFile);
    console.log('[fix-mui-nested] Arquivo nested.js copiado para nó do ThemeProvider.');
  } catch (error) {
    console.error('[fix-mui-nested] Erro ao copiar nested.js:', error);
  }
}

ensureMuiNestedFile();
