const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function corrigirTransportadoras() {
  try {
    console.log('🔧 Corrigindo transportadoras no banco...\n');

    // 1. Verificar dados atuais
    console.log('📊 Verificando dados atuais:');
    
    // Motoristas
    const motoristas = await prisma.motorista.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        transportadoraId: true
      }
    });

    console.log('\n👤 Pessoas:');
    motoristas.forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                       pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      console.log(`${index + 1}. ${pessoa.nome} (${tipoLabel}) - ${pessoa.transportadoraId}`);
    });

    // Controles
    const controles = await prisma.controleCarga.findMany({
      select: {
        id: true,
        motorista: true,
        transportadora: true
      },
      take: 5
    });

    console.log('\n📋 Controles (primeiros 5):');
    controles.forEach((controle, index) => {
      console.log(`${index + 1}. ${controle.motorista} - ${controle.transportadora}`);
    });

    // 2. Corrigir ACERT para ACCERT
    console.log('\n🔄 Corrigindo ACERT → ACCERT...');
    
    // Atualizar motoristas
    const motoristaAcert = await prisma.motorista.updateMany({
      where: { transportadoraId: 'ACERT' },
      data: { transportadoraId: 'ACCERT' }
    });
    console.log(`   Motoristas atualizados: ${motoristaAcert.count}`);

    // Atualizar controles
    const controleAcert = await prisma.controleCarga.updateMany({
      where: { transportadora: 'ACERT' },
      data: { transportadora: 'ACCERT' }
    });
    console.log(`   Controles atualizados: ${controleAcert.count}`);

    // 3. Garantir que clientes tenham RETIRA_CLIENTE
    console.log('\n🏢 Garantindo que clientes tenham RETIRA_CLIENTE...');
    const clientesAtualizados = await prisma.motorista.updateMany({
      where: { 
        tipo: 'CLIENTE',
        NOT: { transportadoraId: 'RETIRA_CLIENTE' }
      },
      data: { transportadoraId: 'RETIRA_CLIENTE' }
    });
    console.log(`   Clientes atualizados: ${clientesAtualizados.count}`);

    // 4. Garantir que funcionários tenham RETIRA_VENDEDOR
    console.log('\n👨‍💼 Garantindo que funcionários tenham RETIRA_VENDEDOR...');
    const funcionariosAtualizados = await prisma.motorista.updateMany({
      where: { 
        tipo: 'FUNCIONARIO',
        NOT: { transportadoraId: 'RETIRA_VENDEDOR' }
      },
      data: { transportadoraId: 'RETIRA_VENDEDOR' }
    });
    console.log(`   Funcionários atualizados: ${funcionariosAtualizados.count}`);

    // 5. Verificar resultado final
    console.log('\n📊 Resultado final:');
    const pessoasFinais = await prisma.motorista.findMany({
      select: {
        nome: true,
        tipo: true,
        transportadoraId: true
      },
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    const porTransportadora = {};
    pessoasFinais.forEach(pessoa => {
      if (!porTransportadora[pessoa.transportadoraId]) {
        porTransportadora[pessoa.transportadoraId] = [];
      }
      porTransportadora[pessoa.transportadoraId].push(`${pessoa.nome} (${pessoa.tipo})`);
    });

    Object.keys(porTransportadora).forEach(transp => {
      console.log(`\n   ${transp}:`);
      porTransportadora[transp].forEach((pessoa, index) => {
        console.log(`     ${index + 1}. ${pessoa}`);
      });
    });

    console.log('\n🎉 Correção concluída!');
    console.log('\n✅ Agora você pode executar: npx prisma db push');

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  } finally {
    await prisma.$disconnect();
  }
}

corrigirTransportadoras();
