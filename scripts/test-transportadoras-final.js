const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTransportadorasFinal() {
  try {
    console.log('🧪 Teste final das transportadoras...\n');

    // 1. Buscar todas as pessoas
    const pessoas = await prisma.motorista.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    console.log(`📊 Total: ${pessoas.length} pessoas\n`);

    // 2. Mapeamento de transportadoras (igual ao componente)
    const transportadoraMap = {
      'ACCERT': 'ACCERT Transportes',
      'ACERT': 'ACCERT Transportes', // Compatibilidade
      'EXPRESSO_GOIAS': 'Expresso Goiás',
      'TERCEIRIZADA': 'Terceirizada',
      'DETAFRA_TRANSPORTES': 'Detafra Transportes',
      'RETIRA_VENDEDOR': 'Retira Vendedor',
      'RETIRA_CLIENTE': 'Retira Cliente'
    };

    // 3. Simular o que aparece no dropdown
    console.log('🎯 Como aparecerá no dropdown:');
    
    const porTipo = {
      MOTORISTA: pessoas.filter(p => p.tipo === 'MOTORISTA'),
      FUNCIONARIO: pessoas.filter(p => p.tipo === 'FUNCIONARIO'),
      CLIENTE: pessoas.filter(p => p.tipo === 'CLIENTE')
    };

    console.log('\n🚛 MOTORISTAS:');
    porTipo.MOTORISTA.forEach((motorista, index) => {
      const transportadoraNome = transportadoraMap[motorista.transportadoraId] || motorista.transportadoraId;
      console.log(`${index + 1}. ${motorista.nome}`);
      console.log(`   Transportadora: ${transportadoraNome}`);
      console.log(`   CNH: ${motorista.cnh}`);
      console.log('');
    });

    console.log('👨‍💼 FUNCIONÁRIOS:');
    porTipo.FUNCIONARIO.forEach((funcionario, index) => {
      const transportadoraNome = transportadoraMap[funcionario.transportadoraId] || funcionario.transportadoraId;
      console.log(`${index + 1}. ${funcionario.nome}`);
      console.log(`   Transportadora: ${transportadoraNome}`);
      console.log('');
    });

    console.log('🏢 CLIENTES:');
    porTipo.CLIENTE.forEach((cliente, index) => {
      const transportadoraNome = transportadoraMap[cliente.transportadoraId] || cliente.transportadoraId;
      console.log(`${index + 1}. ${cliente.nome}`);
      console.log(`   Transportadora: ${transportadoraNome}`);
      console.log('');
    });

    // 4. Verificar problemas específicos
    console.log('🔍 Verificações específicas:');
    
    const clientesSemRetiraCliente = porTipo.CLIENTE.filter(c => c.transportadoraId !== 'RETIRA_CLIENTE');
    if (clientesSemRetiraCliente.length > 0) {
      console.log(`❌ ${clientesSemRetiraCliente.length} clientes sem RETIRA_CLIENTE:`);
      clientesSemRetiraCliente.forEach(c => {
        console.log(`   - ${c.nome}: ${c.transportadoraId}`);
      });
    } else {
      console.log('✅ Todos os clientes têm RETIRA_CLIENTE');
    }

    const funcionariosSemRetiraVendedor = porTipo.FUNCIONARIO.filter(f => f.transportadoraId !== 'RETIRA_VENDEDOR');
    if (funcionariosSemRetiraVendedor.length > 0) {
      console.log(`❌ ${funcionariosSemRetiraVendedor.length} funcionários sem RETIRA_VENDEDOR:`);
      funcionariosSemRetiraVendedor.forEach(f => {
        console.log(`   - ${f.nome}: ${f.transportadoraId}`);
      });
    } else {
      console.log('✅ Todos os funcionários têm RETIRA_VENDEDOR');
    }

    const pessoasComAccert = pessoas.filter(p => p.transportadoraId === 'ACCERT');
    console.log(`✅ ${pessoasComAccert.length} pessoas com ACCERT (correto)`);

    const pessoasComAcert = pessoas.filter(p => p.transportadoraId === 'ACERT');
    if (pessoasComAcert.length > 0) {
      console.log(`⚠️ ${pessoasComAcert.length} pessoas ainda com ACERT (precisa corrigir)`);
    } else {
      console.log('✅ Nenhuma pessoa com ACERT (correto)');
    }

    // 5. Teste de seleção
    console.log('\n🧪 Simulando seleção no componente:');
    
    if (porTipo.CLIENTE.length > 0) {
      const cliente = porTipo.CLIENTE[0];
      console.log(`Cliente selecionado: ${cliente.nome}`);
      console.log(`Transportadora que será definida: ${cliente.transportadoraId}`);
      console.log(`Nome que aparecerá: ${transportadoraMap[cliente.transportadoraId]}`);
    }

    if (porTipo.MOTORISTA.length > 0) {
      const motorista = porTipo.MOTORISTA.find(m => m.transportadoraId === 'ACCERT');
      if (motorista) {
        console.log(`Motorista ACCERT selecionado: ${motorista.nome}`);
        console.log(`Transportadora que será definida: ${motorista.transportadoraId}`);
        console.log(`Nome que aparecerá: ${transportadoraMap[motorista.transportadoraId]}`);
      }
    }

    console.log('\n🎉 Teste concluído!');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTransportadorasFinal();
