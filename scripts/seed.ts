import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Verifica se já existe um usuário admin
  const adminExists = await prisma.usuario.findUnique({
    where: { email: 'admin@controlecarga.com' },
  });

  if (!adminExists) {
    const hashedPassword = await hash('admin123', 12);
    
    await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: 'admin@controlecarga.com',
        senha: hashedPassword,
        tipo: 'ADMIN',
      },
    });
    
    console.log('Usuário administrador criado com sucesso!');
  } else {
    console.log('Usuário administrador já existe.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
