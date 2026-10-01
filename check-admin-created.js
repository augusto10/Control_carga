const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const admin = await prisma.usuario.findUnique({
      where: { email: 'admin@controlecarga.com' }
    });

    if (admin) {
      console.log('✅ Usuário admin@controlecarga.com encontrado:');
      console.log('ID:', admin.id);
      console.log('Nome:', admin.nome);
      console.log('Email:', admin.email);
      console.log('Tipo:', admin.tipo);
      console.log('Ativo:', admin.ativo);
      console.log('');
      console.log('🔑 Credenciais para login:');
      console.log('Email: admin@controlecarga.com');
      console.log('Senha: 12345678');
    } else {
      console.log('❌ Usuário não encontrado');
    }
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
