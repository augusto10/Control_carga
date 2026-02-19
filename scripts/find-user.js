require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Buscando usuário com o email 'admin@controlecarga.com'...");
  try {
    const user = await prisma.usuario.findUnique({
      where: {
        email: 'admin@controlecarga.com',
      },
    });

    if (user) {
      console.log('✅ Usuário encontrado:');
      const { senha, ...userWithoutPassword } = user;
      console.log(userWithoutPassword);
    } else {
      console.log('❌ Nenhum usuário encontrado com este email.');
    }
  } catch (e) {
    console.error('❌ Ocorreu um erro ao buscar o usuário:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
