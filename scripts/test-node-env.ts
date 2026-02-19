// Verificar se estamos no ambiente Node.js
console.log('Versão do Node.js:', process.version);
console.log('Plataforma:', process.platform);
console.log('Diretório atual:', process.cwd());

// Tentar importar o Prisma
try {
  // @ts-ignore
  const { PrismaClient } = require('@prisma/client');
  console.log('Prisma importado com sucesso!');
  
  const prisma = new PrismaClient();
  console.log('Modelos disponíveis no Prisma Client:');
  console.log(Object.keys(prisma).filter(key => !key.startsWith('_') && key !== 'PrismaClientKnownRequestError'));
  
} catch (error) {
  console.error('Erro ao importar o Prisma:', error);
}
