const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createSpecificAdmin() {
  console.log('🔧 Criando usuário admin específico...');

  try {
    // Verificar se admin já existe
    const existingAdmin = await prisma.usuario.findUnique({
      where: { email: 'admin@controlecarga.com' }
    });

    if (existingAdmin) {
      console.log('ℹ️ Usuário admin@controlecarga.com já existe');
      return;
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('12345678', 10);

    // Criar usuário admin
    const admin = await prisma.usuario.create({
      data: {
        nome: 'Administrador Controle Carga',
        email: 'admin@controlecarga.com',
        senha: hashedPassword,
        tipo: 'ADMIN',
        ativo: true
      }
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email: admin@controlecarga.com');
    console.log('🔑 Senha: 12345678');

  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSpecificAdmin();
