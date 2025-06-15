import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

type TipoUsuario = 'ADMIN' | 'USUARIO';

const prisma = new PrismaClient();

async function main() {
  // Verificar se já existe um usuário admin
  const adminExists = await prisma.$queryRaw`
    SELECT * FROM "Usuario" WHERE email = 'admin@controlecarga.com' LIMIT 1
  ` as any[];

  if (!adminExists || adminExists.length === 0) {
    const hashedPassword = await hash('admin123', 10);
    
    await prisma.$executeRaw`
      INSERT INTO "Usuario" (nome, email, senha, tipo, ativo, "dataCriacao", "ultimoAcesso")
      VALUES (
        'Administrador',
        'admin@controlecarga.com',
        ${hashedPassword},
        'ADMIN',
        true,
        NOW(),
        NOW()
      )
    `;

    console.log('Usuário administrador criado com sucesso!');
    console.log('Email: admin@controlecarga.com');
    console.log('Senha: admin123');
  } else {
    console.log('Usuário administrador já existe no banco de dados.');
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
