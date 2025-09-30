const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestControle() {
  try {
    console.log('🔧 Criando controle de teste...\n');

    // Criar controle de teste apenas com campos básicos existentes no schema
    const controle = await prisma.controleCarga.create({
      data: {
        motorista: 'Motorista Teste',
        responsavel: 'Responsável Teste',
        transportadora: 'ACCERT', // Valor válido do enum
        qtdPalletsLevados: 10,
        qtdPalletsDevolvidos: 8,
        finalizado: true,
        cpfMotorista: '123.456.789-00',
        numeroManifesto: 'TEST-001',
        observacao: 'Controle criado para teste dos relatórios',
        qtdPallets: 10
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
