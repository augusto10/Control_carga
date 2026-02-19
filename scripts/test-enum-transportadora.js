const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEnumTransportadora() {
  try {
    console.log('🧪 Testando enum Transportadora...\n');

    // 1. Verificar pessoas no banco
    const pessoas = await prisma.motorista.findMany({
      select: {
        nome: true,
        tipo: true,
        transportadoraId: true
      },
      orderBy: { nome: 'asc' }
    });

    console.log('📊 Pessoas no banco:');
    pessoas.forEach((pessoa, index) => {
      console.log(`${index + 1}. ${pessoa.nome} (${pessoa.tipo}) - ${pessoa.transportadoraId}`);
    });

    // 2. Verificar se ACCERT e RETIRA_CLIENTE existem
    const accertPessoas = pessoas.filter(p => p.transportadoraId === 'ACCERT');
    const retiraClientePessoas = pessoas.filter(p => p.transportadoraId === 'RETIRA_CLIENTE');

    console.log(`\n🚛 ACCERT: ${accertPessoas.length} pessoas`);
    accertPessoas.forEach(p => console.log(`   - ${p.nome} (${p.tipo})`));

    console.log(`\n🏢 RETIRA_CLIENTE: ${retiraClientePessoas.length} pessoas`);
    retiraClientePessoas.forEach(p => console.log(`   - ${p.nome} (${p.tipo})`));

    // 3. Tentar criar pessoa com ACCERT para testar enum
    console.log('\n🧪 Testando criação com ACCERT...');
    try {
      const testePessoa = await prisma.motorista.create({
        data: {
          nome: 'Teste ACCERT',
          telefone: '(11) 99999-9999',
          cpf: '99999999999',
          cnh: '99999999999',
          transportadoraId: 'ACCERT',
          tipo: 'MOTORISTA'
        }
      });
      console.log('✅ Criação com ACCERT funcionou!');
      
      // Deletar o teste
      await prisma.motorista.delete({ where: { id: testePessoa.id } });
      console.log('🗑️ Pessoa de teste removida');
    } catch (error) {
      console.error('❌ Erro ao criar com ACCERT:', error.message);
    }

    // 4. Tentar criar pessoa com RETIRA_CLIENTE para testar enum
    console.log('\n🧪 Testando criação com RETIRA_CLIENTE...');
    try {
      const testePessoa = await prisma.motorista.create({
        data: {
          nome: 'Teste RETIRA_CLIENTE',
          telefone: '(11) 99999-9999',
          cpf: '88888888888',
          cnh: null,
          transportadoraId: 'RETIRA_CLIENTE',
          tipo: 'CLIENTE'
        }
      });
      console.log('✅ Criação com RETIRA_CLIENTE funcionou!');
      
      // Deletar o teste
      await prisma.motorista.delete({ where: { id: testePessoa.id } });
      console.log('🗑️ Pessoa de teste removida');
    } catch (error) {
      console.error('❌ Erro ao criar com RETIRA_CLIENTE:', error.message);
    }

    // 5. Verificar se há problema de tipo no TypeScript
    console.log('\n🔍 Verificando tipos TypeScript...');
    
    // Simular o que acontece no componente
    const pessoaAccert = pessoas.find(p => p.transportadoraId === 'ACCERT');
    const pessoaRetiraCliente = pessoas.find(p => p.transportadoraId === 'RETIRA_CLIENTE');

    if (pessoaAccert) {
      console.log(`ACCERT encontrada: ${pessoaAccert.nome}`);
      console.log(`Tipo da transportadora: ${typeof pessoaAccert.transportadoraId}`);
      console.log(`Valor: "${pessoaAccert.transportadoraId}"`);
    } else {
      console.log('❌ Nenhuma pessoa com ACCERT encontrada');
    }

    if (pessoaRetiraCliente) {
      console.log(`RETIRA_CLIENTE encontrada: ${pessoaRetiraCliente.nome}`);
      console.log(`Tipo da transportadora: ${typeof pessoaRetiraCliente.transportadoraId}`);
      console.log(`Valor: "${pessoaRetiraCliente.transportadoraId}"`);
    } else {
      console.log('❌ Nenhuma pessoa com RETIRA_CLIENTE encontrada');
    }

    // 6. Verificar valores únicos de transportadoras
    console.log('\n📋 Todas as transportadoras em uso:');
    const transportadorasUnicas = [...new Set(pessoas.map(p => p.transportadoraId))];
    transportadorasUnicas.forEach((transp, index) => {
      const count = pessoas.filter(p => p.transportadoraId === transp).length;
      console.log(`${index + 1}. "${transp}" - ${count} pessoas`);
    });

    console.log('\n🎉 Teste concluído!');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEnumTransportadora();
