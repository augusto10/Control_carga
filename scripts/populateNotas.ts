import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Primeiro verifica se existe algum controle
  const controle = await prisma.controleCarga.findFirst();
  
  if (!controle) {
    console.log('Criando um controle de carga para teste...');
    await prisma.controleCarga.create({
      data: {
        motorista: 'Motorista Teste',
        responsavel: 'Responsável Teste',
        finalizado: false
      }
    });
  }

  // Adiciona 3 notas de teste
  console.log('Adicionando notas de teste...');
  await prisma.notaFiscal.createMany({
    data: [
      { numeroNota: '12345', codigo: 'TEST001', valor: 100.50 },
      { numeroNota: '67890', codigo: 'TEST002', valor: 200.75 },
      { numeroNota: '54321', codigo: 'TEST003', valor: 150.25 }
    ],
    skipDuplicates: true
  });

  console.log('Notas de teste criadas com sucesso!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
