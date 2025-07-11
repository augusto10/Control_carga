import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();

  const email = 'admin@exemplo.com';
  const senha = 'admin123'; // Altere a senha se desejar
  const nome = 'Administrador';

  // Gera o hash da senha
  const senhaHash = await bcrypt.hash(senha, 10);

  const user = await prisma.usuario.create({
    data: {
      email,
      nome,
      senha: senhaHash,
      tipo: 'ADMIN' // Altere para o valor correto do enum se necessário
    }
  });

  console.log('Usuário admin criado:', user);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
