const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTransportadoras() {
  try {
    console.log('🔍 Debugando problema das transportadoras...\n');

    // 1. Verificar todas as pessoas e suas transportadoras
    const pessoas = await prisma.motorista.findMany({
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

    console.log('📊 Pessoas no banco:');
    pessoas.forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                       pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      console.log(`${index + 1}. ${pessoa.nome} (${tipoLabel}) - Transportadora: ${pessoa.transportadoraId}`);
    });

    // 2. Verificar especificamente clientes e ACCERT
    console.log('\n🏢 Clientes:');
    const clientes = pessoas.filter(p => p.tipo === 'CLIENTE');
    clientes.forEach((cliente, index) => {
      console.log(`${index + 1}. ${cliente.nome} - ${cliente.transportadoraId}`);
    });

    console.log('\n🚛 Pessoas com ACCERT:');
    const accertPessoas = pessoas.filter(p => p.transportadoraId === 'ACCERT');
    accertPessoas.forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                       pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      console.log(`${index + 1}. ${pessoa.nome} (${tipoLabel})`);
    });

    // 3. Verificar mapeamento de transportadoras
    console.log('\n🗺️ Mapeamento de transportadoras:');
    const transportadoraMap = {
      'ACCERT': 'ACCERT Transportes',
      'EXPRESSO_GOIAS': 'Expresso Goiás',
      'TERCEIRIZADA': 'Terceirizada',
      'DETAFRA_TRANSPORTES': 'Detafra Transportes',
      'RETIRA_VENDEDOR': 'Retira Vendedor',
      'RETIRA_CLIENTE': 'Retira Cliente'
    };

    const transportadorasUsadas = [...new Set(pessoas.map(p => p.transportadoraId))];
    transportadorasUsadas.forEach(transp => {
      const nome = transportadoraMap[transp] || `❌ NÃO MAPEADA: ${transp}`;
      console.log(`   ${transp} → ${nome}`);
    });

    // 4. Simular seleção de cliente
    console.log('\n🧪 Simulando seleção de cliente:');
    const clienteTeste = clientes[0];
    if (clienteTeste) {
      console.log(`Cliente selecionado: ${clienteTeste.nome}`);
      console.log(`Transportadora no banco: ${clienteTeste.transportadoraId}`);
      console.log(`Transportadora mapeada: ${transportadoraMap[clienteTeste.transportadoraId] || 'NÃO ENCONTRADA'}`);
      
      // Verificar se está no enum
      const enumTransportadoras = ['ACERT', 'EXPRESSO_GOIAS', 'ACCERT', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE'];
      const estaNoEnum = enumTransportadoras.includes(clienteTeste.transportadoraId);
      console.log(`Está no enum Transportadora: ${estaNoEnum ? '✅ SIM' : '❌ NÃO'}`);
    }

    // 5. Verificar se há problema com ACCERT vs ACERT
    console.log('\n⚠️ Verificando problema ACCERT vs ACERT:');
    const accertCount = pessoas.filter(p => p.transportadoraId === 'ACCERT').length;
    const acertCount = pessoas.filter(p => p.transportadoraId === 'ACERT').length;
    console.log(`   ACCERT: ${accertCount} pessoas`);
    console.log(`   ACERT: ${acertCount} pessoas`);

    if (accertCount > 0 && acertCount === 0) {
      console.log('   🔧 Problema identificado: Pessoas têm ACCERT mas enum tem ACERT');
    }

    console.log('\n💡 Possíveis soluções:');
    console.log('   1. Corrigir enum para usar ACCERT (não ACERT)');
    console.log('   2. Atualizar dados para usar ACERT (não ACCERT)');
    console.log('   3. Adicionar ambos ao mapeamento');

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTransportadoras();
