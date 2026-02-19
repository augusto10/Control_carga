const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🔧 Criando usuário admin...');

  try {
    // Verificar se admin já existe
    const existingAdmin = await prisma.usuario.findUnique({
      where: { email: 'admin@esplendor.com' }
    });

    if (existingAdmin) {
      console.log('ℹ️ Usuário admin já existe');
      return;
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash('adm123', 10);

    // Criar usuário admin
    const admin = await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: 'admin@esplendor.com',
        senha: hashedPassword,
        tipo: 'ADMIN',
        ativo: true
      }
    });

    console.log('✅ Usuário admin criado com sucesso!');
    console.log('📧 Email: admin@esplendor.com');
    console.log('🔑 Senha: adm123');
    
  } catch (error) {
    console.error('❌ Erro ao criar admin:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
