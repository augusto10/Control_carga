const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDadosPosMigracao() {
  try {
    console.log('🔧 Corrigindo dados após migração...\n');

    // 1. Verificar se o campo tipo foi criado
    console.log('1️⃣ Verificando campo tipo...');
    const motoristas = await prisma.motorista.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        cnh: true,
        transportadoraId: true
      },
      take: 5
    });
    
    console.log(`✅ Campo tipo existe! Encontrados ${motoristas.length} registros de exemplo`);

    // 2. Contar registros sem tipo definido
    const semTipo = await prisma.motorista.count({
      where: { tipo: null }
    });
    
    console.log(`📊 Registros sem tipo: ${semTipo}`);

    if (semTipo > 0) {
      console.log('\n2️⃣ Definindo tipos baseado na CNH e transportadora...');
      
      // Definir motoristas (têm CNH)
      const motoristasCNH = await prisma.motorista.updateMany({
        where: {
          tipo: null,
          cnh: { not: null }
        },
        data: { tipo: 'MOTORISTA' }
      });
      console.log(`✅ ${motoristasCNH.count} pessoas definidas como MOTORISTA (têm CNH)`);

      // Definir clientes (RETIRA_CLIENTE)
      const clientes = await prisma.motorista.updateMany({
        where: {
          tipo: null,
          transportadoraId: 'RETIRA_CLIENTE'
        },
        data: { tipo: 'CLIENTE' }
      });
      console.log(`✅ ${clientes.count} pessoas definidas como CLIENTE (RETIRA_CLIENTE)`);

      // Definir funcionários (RETIRA_VENDEDOR)
      const funcionarios = await prisma.motorista.updateMany({
        where: {
          tipo: null,
          transportadoraId: 'RETIRA_VENDEDOR'
        },
        data: { tipo: 'FUNCIONARIO' }
      });
      console.log(`✅ ${funcionarios.count} pessoas definidas como FUNCIONARIO (RETIRA_VENDEDOR)`);

      // Definir restantes como MOTORISTA
      const restantes = await prisma.motorista.updateMany({
        where: { tipo: null },
        data: { tipo: 'MOTORISTA' }
      });
      console.log(`✅ ${restantes.count} pessoas restantes definidas como MOTORISTA`);
    }

    // 3. Corrigir ACERT para ACCERT
    console.log('\n3️⃣ Corrigindo ACERT para ACCERT...');
    
    // Controles
    const controlesAcert = await prisma.controleCarga.updateMany({
      where: { transportadora: 'ACERT' },
      data: { transportadora: 'ACCERT' }
    });
    console.log(`✅ ${controlesAcert.count} controles corrigidos (ACERT → ACCERT)`);

    // Notas (se existir campo transportadora)
    try {
      const notasAcert = await prisma.notaFiscal.updateMany({
        where: { transportadora: 'ACERT' },
        data: { transportadora: 'ACCERT' }
      });
      console.log(`✅ ${notasAcert.count} notas corrigidas (ACERT → ACCERT)`);
    } catch (error) {
      console.log('ℹ️ Notas fiscais não têm campo transportadora (normal)');
    }

    // Motoristas
    const motoristasAcert = await prisma.motorista.updateMany({
      where: { transportadoraId: 'ACERT' },
      data: { transportadoraId: 'ACCERT' }
    });
    console.log(`✅ ${motoristasAcert.count} motoristas corrigidos (ACERT → ACCERT)`);

    // 4. Verificar resultado final
    console.log('\n4️⃣ Verificando resultado final...');
    
    const tipoStats = await prisma.motorista.groupBy({
      by: ['tipo'],
      _count: { tipo: true }
    });
    
    console.log('📊 Distribuição por tipo:');
    tipoStats.forEach(stat => {
      const label = stat.tipo === 'MOTORISTA' ? 'Motoristas' : 
                   stat.tipo === 'FUNCIONARIO' ? 'Funcionários' : 'Clientes';
      console.log(`   ${label}: ${stat._count.tipo}`);
    });

    // Verificar se ainda há ACERT
    const aindaAcert = await prisma.controleCarga.count({
      where: { transportadora: 'ACERT' }
    });
    
    if (aindaAcert === 0) {
      console.log('✅ Nenhum registro com ACERT encontrado');
    } else {
      console.log(`⚠️ Ainda há ${aindaAcert} registros com ACERT`);
    }

    console.log('\n🎉 Correção concluída!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Fazer commit das mudanças');
    console.log('   2. Fazer push para o repositório');
    console.log('   3. Aguardar deploy automático no Vercel');
    console.log('   4. Testar o sistema');

  } catch (error) {
    console.error('❌ Erro durante correção:', error);
    
    if (error.message.includes('does not exist')) {
      console.log('\n💡 DICA: Execute primeiro a migração:');
      console.log('   npx prisma migrate dev --name add-tipo-field');
      console.log('   npx prisma migrate deploy');
    }
  } finally {
    await prisma.$disconnect();
  }
}

fixDadosPosMigracao();
