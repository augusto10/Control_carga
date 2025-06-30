import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Verificar se o usuário admin já existe
  const adminExists = await prisma.usuario.findUnique({
    where: { email: 'admin@controlecarga.com' },
  });

  if (!adminExists) {
    // Criar o usuário admin
    const hashedPassword = await hash('adm123', 10);
    
    const admin = await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: 'admin@controlecarga.com',
        senha: hashedPassword,
        tipo: 'ADMIN',
        ativo: true,
      },
    });

    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('Email: admin@controlecarga.com');
    console.log('Senha: adm123');
    console.log('ID do usuário:', admin.id);
  } else {
    console.log('ℹ️ Usuário administrador já existe no banco de dados.');
    console.log('ID do usuário:', adminExists?.id);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar usuário administrador:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
