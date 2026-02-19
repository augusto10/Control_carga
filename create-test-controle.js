const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestControle() {
  try {
    console.log('🔧 Criando controle de teste...\n');

    // Buscar usuário admin
    const admin = await prisma.usuario.findFirst({
      where: { tipo: 'ADMIN' }
    });

    if (!admin) {
      console.log('❌ Nenhum usuário admin encontrado');
      return;
    }

    // Criar controle de teste
    const controle = await prisma.controleCarga.create({
      data: {
        motorista: 'Motorista Teste',
        transportadora: 'ACERT',
        qtdPalletsLevados: 10,
        qtdPalletsDevolvidos: 8,
        motoristaAssinou: true,
        responsavelAssinou: true,
        finalizado: true,
        cpfMotorista: '123.456.789-00',
        usuarioId: admin.id,
        numeroManifesto: 'TEST-001',
        observacao: 'Controle criado para teste dos relatórios'
      }
    });

    console.log('✅ Controle de teste criado com sucesso!');
    console.log('ID:', controle.id);
    console.log('Motorista:', controle.motorista);
    console.log('Transportadora:', controle.transportadora);
    console.log('Pallets Levados:', controle.qtdPalletsLevados);
    console.log('Pallets Devolvidos:', controle.qtdPalletsDevolvidos);
    console.log('Finalizado:', controle.finalizado);

    // Verificar controles agora
    const controles = await prisma.controleCarga.findMany({
      select: {
        id: true,
        motorista: true,
        transportadora: true,
        qtdPalletsLevados: true,
        qtdPalletsDevolvidos: true,
        finalizado: true
      }
    });

    console.log(`\n📋 Total de controles agora: ${controles.length}`);

  } catch (error) {
    console.error('❌ Erro ao criar controle de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestControle();
