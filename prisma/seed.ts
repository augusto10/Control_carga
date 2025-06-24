import { PrismaClient, TipoUsuario } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@controlecarga.com';
  const adminPassword = '12345678';

  // 1. Deleta o usuário admin antigo, se existir, para garantir um estado limpo.
  await prisma.usuario.deleteMany({
    where: { email: adminEmail },
  });
  console.log(`Limpeza concluída: usuário '${adminEmail}' removido (se existia).`);

  // 2. Cria o novo usuário admin com os dados corretos.
  const hashedPassword = await hash(adminPassword, 12);

  const adminUser = await prisma.usuario.create({
    data: {
      nome: 'Administrador',
      email: adminEmail,
      senha: hashedPassword,
      tipo: TipoUsuario.ADMIN, // Usando o enum diretamente para segurança de tipos
      ativo: true,
    },
  });

  console.log('Usuário administrador criado/recriado com sucesso!');
  console.log(`  ID: ${adminUser.id}`);
  console.log(`  Email: ${adminUser.email}`);
  console.log(`  Senha: ${adminPassword}`);

  // Create funcionario user
  const funcionarioEmail = 'funcionario@controlecarga.com';
  const funcionarioPassword = '12345678';

  await prisma.usuario.deleteMany({
    where: { email: funcionarioEmail },
  });

  const hashedFuncionarioPassword = await hash(funcionarioPassword, 12);
  const funcionarioUser = await prisma.usuario.create({
    data: {
      nome: 'Funcionário Teste',
      email: funcionarioEmail,
      senha: hashedFuncionarioPassword,
      tipo: TipoUsuario.FUNCIONARIO,
      ativo: true,
    },
  });

  console.log('Usuário funcionário criado com sucesso!');
  console.log(`  ID: ${funcionarioUser.id}`);
  console.log(`  Email: ${funcionarioUser.email}`);
  console.log(`  Senha: ${funcionarioPassword}`);

  // Create cliente user
  const clienteEmail = 'cliente@controlecarga.com';
  const clientePassword = '12345678';

  await prisma.usuario.deleteMany({
    where: { email: clienteEmail },
  });

  const hashedClientePassword = await hash(clientePassword, 12);
  const clienteUser = await prisma.usuario.create({
    data: {
      nome: 'Cliente Teste',
      email: clienteEmail,
      senha: hashedClientePassword,
      tipo: TipoUsuario.CLIENTE,
      ativo: true,
    },
  });

  console.log('Usuário cliente criado com sucesso!');
  console.log(`  ID: ${clienteUser.id}`);
  console.log(`  Email: ${clienteUser.email}`);
  console.log(`  Senha: ${clientePassword}`);
}

main()
  .catch((e) => {
    console.error('Ocorreu um erro durante a execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Execução do seed finalizada.');
  });
