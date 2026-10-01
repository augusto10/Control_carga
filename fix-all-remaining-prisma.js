const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, 'pages', 'api');
const appPath = path.join(__dirname, 'app');

function walkDir(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (item.endsWith('.ts') || item.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const allFiles = [...walkDir(apiPath), ...walkDir(appPath)];
let count = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Substituir todos os padrões de import de lib/prisma por @/lib/prisma
  content = content.replace(/from ['"]\.\.\/.*lib\/prisma['"]/g, "from '@/lib/prisma'");
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Atualizado: ${file}`);
    count++;
  }
}

console.log(`\nTotal de arquivos atualizados: ${count}`);
