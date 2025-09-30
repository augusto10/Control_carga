const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function recriarTransportadoras() {
  try {
    console.log('🚚 Recriando transportadoras do sistema...\n');

    // 1. Verificar se já existem transportadoras
    const transportadorasExistentes = await prisma.transportadoraModel.count();
    console.log(`📊 Transportadoras existentes: ${transportadorasExistentes}`);

    if (transportadorasExistentes > 0) {
      console.log('✅ Já existem transportadoras no sistema!');
      const transportadoras = await prisma.transportadoraModel.findMany({
        select: {
          id: true,
          nome: true,
          ativo: true
        }
      });
      
      console.log('\n🚚 Transportadoras encontradas:');
      transportadoras.forEach((transp, index) => {
        const status = transp.ativo ? '✅ Ativa' : '❌ Inativa';
        console.log(`${index + 1}. ${transp.nome} (${transp.id}) - ${status}`);
      });
      return;
    }

    // 2. Criar transportadoras padrão
    console.log('\n🔧 Criando transportadoras padrão...');

    const transportadoras = [
      {
        id: 'ACCERT',
        nome: 'ACCERT Transportes',
        ativo: true
      },
      {
        id: 'EXPRESSO_GOIAS',
        nome: 'Expresso Goiás',
        ativo: true
      },
      {
        id: 'TERCEIRIZADA',
        nome: 'Terceirizada',
        ativo: true
      },
      {
        id: 'DETAFRA_TRANSPORTES',
        nome: 'Detafra Transportes',
        ativo: true
      },
      {
        id: 'RETIRA_VENDEDOR',
        nome: 'Retira Vendedor',
        ativo: true
      },
      {
        id: 'RETIRA_CLIENTE',
        nome: 'Retira Cliente',
        ativo: true
      }
    ];

    for (const transpData of transportadoras) {
      try {
        const transportadora = await prisma.transportadoraModel.create({
          data: transpData
        });

        console.log(`   ✅ ${transpData.nome} (${transpData.id})`);
      } catch (error) {
        console.log(`   ⚠️ ${transpData.nome}: já existe ou erro`);
      }
    }

    // 3. Verificar resultado
    console.log('\n📊 Resultado final:');
    const total = await prisma.transportadoraModel.count();
    console.log(`   Transportadoras criadas: ${total}`);

    const todasTransportadoras = await prisma.transportadoraModel.findMany({
      orderBy: { nome: 'asc' }
    });

    console.log('\n🚚 Lista completa:');
    todasTransportadoras.forEach((transp, index) => {
      const status = transp.ativo ? '✅' : '❌';
      console.log(`${index + 1}. ${transp.nome} (${transp.id}) ${status}`);
    });

    console.log('\n🎉 Transportadoras recriadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao recriar transportadoras:', error);
  } finally {
    await prisma.$disconnect();
  }
}

recriarTransportadoras();
