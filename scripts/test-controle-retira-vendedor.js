const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testControleRetiraVendedor() {
  console.log('🧪 Testando criação de controle com RETIRA_VENDEDOR...\n');

  try {
    // 1. Verificar enum atual
    console.log('1️⃣ ENUM ATUAL NO BANCO:');
    const enumValues = await prisma.$queryRaw`
      SELECT enumlabel as transportadora 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
      ORDER BY enumsortorder
    `;
    console.table(enumValues);

    // 2. Simular criação de controle RETIRA_VENDEDOR
    console.log('\n2️⃣ SIMULANDO CRIAÇÃO DE CONTROLE RETIRA_VENDEDOR:');
    
    // Dados de teste
    const dadosControle = {
      motorista: 'TESTE MOTORISTA RV',
      cpfMotorista: '12345678901',
      responsavel: 'TESTE RESPONSAVEL',
      transportadora: 'RETIRA_VENDEDOR',
      numeroManifesto: 'TEST001',
      qtdPalletsLevados: 10,
      qtdPalletsDevolvidos: 2,
      placaVeiculo: 'ABC1234',
      observacao: 'Teste RETIRA_VENDEDOR'
    };

    // Aplicar a mesma lógica da API
    let transportadoraParaBanco = dadosControle.transportadora;
    let motoristaParaSalvar = dadosControle.motorista;
    
    if (dadosControle.transportadora === 'RETIRA_VENDEDOR') {
      transportadoraParaBanco = 'TERCEIRIZADA';
      motoristaParaSalvar = `${dadosControle.motorista} [RV]`;
      console.log('🔄 Mapeando RETIRA_VENDEDOR -> TERCEIRIZADA');
    }

    console.log('📝 Dados para salvar no banco:', {
      motorista: motoristaParaSalvar,
      transportadora: transportadoraParaBanco
    });

    // Tentar criar o controle
    const novoControle = await prisma.controleCarga.create({
      data: {
        motorista: motoristaParaSalvar,
        cpfMotorista: dadosControle.cpfMotorista,
        responsavel: dadosControle.responsavel,
        transportadora: transportadoraParaBanco,
        numeroManifesto: dadosControle.numeroManifesto,
        qtdPallets: dadosControle.qtdPalletsLevados - dadosControle.qtdPalletsDevolvidos,
        qtdPalletsLevados: dadosControle.qtdPalletsLevados,
        qtdPalletsDevolvidos: dadosControle.qtdPalletsDevolvidos,
        placaVeiculo: dadosControle.placaVeiculo,
        observacao: dadosControle.observacao,
        finalizado: false
      }
    });

    console.log('✅ Controle criado no banco:', {
      id: novoControle.id,
      motorista: novoControle.motorista,
      transportadora: novoControle.transportadora
    });

    // 3. Simular listagem (como a API processa)
    console.log('\n3️⃣ SIMULANDO LISTAGEM (PROCESSAMENTO DA API):');
    
    const controleDb = await prisma.controleCarga.findUnique({
      where: { id: novoControle.id }
    });

    // Aplicar lógica de processamento da API
    let transportadoraProcessada = controleDb.transportadora;
    let motoristaProcessado = controleDb.motorista;
    
    if (controleDb.motorista.includes('[RV]')) {
      transportadoraProcessada = 'RETIRA_VENDEDOR';
      motoristaProcessado = controleDb.motorista.replace(' [RV]', '');
    }

    const controleProcessado = {
      ...controleDb,
      motorista: motoristaProcessado,
      transportadora: transportadoraProcessada
    };

    console.log('📋 Controle processado para exibição:', {
      motorista: controleProcessado.motorista,
      transportadora: controleProcessado.transportadora
    });

    // 4. Verificar se funcionou
    if (controleProcessado.transportadora === 'RETIRA_VENDEDOR' && 
        controleProcessado.motorista === dadosControle.motorista) {
      console.log('\n✅ TESTE PASSOU! Criação de controle com RETIRA_VENDEDOR funcionando.');
    } else {
      console.log('\n❌ TESTE FALHOU! Algo não está funcionando.');
    }

    // 5. Limpeza
    await prisma.controleCarga.delete({ where: { id: novoControle.id } });
    console.log('\n🗑️ Controle teste removido');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testControleRetiraVendedor();
