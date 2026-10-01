// Script simples para testar upload de foto de perfil
const fs = require('fs');
const path = require('path');

// Verificar se a pasta de uploads existe
const uploadDir = path.join(__dirname, 'public', 'uploads', 'avatars');
console.log('Verificando diretório de uploads:', uploadDir);

if (!fs.existsSync(uploadDir)) {
  console.log('Criando diretório de uploads...');
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Diretório criado com sucesso!');
} else {
  console.log('Diretório já existe!');
}

// Listar arquivos no diretório de uploads
const files = fs.readdirSync(uploadDir);
console.log('Arquivos no diretório:', files);

console.log('Teste concluído!');
