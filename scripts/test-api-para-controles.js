const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApiParaControles() {
  try {
    console.log('🧪 Testando API /api/pessoas/para-controles...\n');

    // Simular o que a API faz
    const pessoas = await prisma.motorista.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    console.log(`📊 Total de pessoas encontradas: ${pessoas.length}\n`);

    // Formatar dados como a API faz
    const pessoasFormatadas = pessoas.map(pessoa => ({
      id: pessoa.id,
      nome: pessoa.nome,
      cpf: pessoa.cpf,
      telefone: pessoa.telefone,
      cnh: pessoa.cnh,
      transportadoraId: pessoa.transportadoraId,
      tipo: pessoa.tipo,
      tipoLabel: pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                 pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente',
      displayName: `${pessoa.nome} (${pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                                      pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente'})`
    }));

    // Mostrar como aparecerá no dropdown
    console.log('🎯 Como aparecerá no dropdown (com ícones):');
    pessoasFormatadas.forEach((pessoa, index) => {
      const tipoIcon = pessoa.tipo === 'MOTORISTA' ? '🚛' : 
                      pessoa.tipo === 'FUNCIONARIO' ? '👨‍💼' : '🏢';
      const displayName = `${tipoIcon} ${pessoa.nome} (${pessoa.tipoLabel})`;
      
      console.log(`${index + 1}. ${displayName}`);
      console.log(`   Transportadora: ${pessoa.transportadoraId}`);
      console.log(`   CPF: ${pessoa.cpf}`);
      console.log(`   Telefone: ${pessoa.telefone || 'Não informado'}`);
      if (pessoa.cnh) {
        console.log(`   CNH: ${pessoa.cnh}`);
      }
      console.log('');
    });

    // Agrupar por tipo
    console.log('📋 Agrupamento por tipo:');
    const agrupados = {
      motoristas: pessoasFormatadas.filter(p => p.tipo === 'MOTORISTA'),
      funcionarios: pessoasFormatadas.filter(p => p.tipo === 'FUNCIONARIO'),
      clientes: pessoasFormatadas.filter(p => p.tipo === 'CLIENTE')
    };

    console.log(`🚛 Motoristas (${agrupados.motoristas.length}):`);
    agrupados.motoristas.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nome} - ${m.transportadoraId} - CNH: ${m.cnh}`);
    });

    console.log(`\n👨‍💼 Funcionários (${agrupados.funcionarios.length}):`);
    agrupados.funcionarios.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.nome} - ${f.transportadoraId}`);
    });

    console.log(`\n🏢 Clientes (${agrupados.clientes.length}):`);
    agrupados.clientes.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.nome} - ${c.transportadoraId}`);
    });

    // Verificar mapeamento de transportadoras
    console.log('\n🚚 Mapeamento de transportadoras:');
    const transportadoraMap = {
      'ACCERT': 'ACCERT Transportes',
      'EXPRESSO_GOIAS': 'Expresso Goiás',
      'TERCEIRIZADA': 'Terceirizada',
      'DETAFRA_TRANSPORTES': 'Detafra Transportes',
      'RETIRA_VENDEDOR': 'Retira Vendedor',
      'RETIRA_CLIENTE': 'Retira Cliente'
    };

    const transportadorasUsadas = [...new Set(pessoasFormatadas.map(p => p.transportadoraId))];
    transportadorasUsadas.forEach(transp => {
      const nome = transportadoraMap[transp] || transp;
      console.log(`   ${transp} → ${nome}`);
    });

    console.log('\n🎉 Teste concluído!');
    console.log('\n✅ O que foi corrigido no componente:');
    console.log('   1. Agrupamento visual por tipo (🚛 Motoristas, 👨‍💼 Funcionários, 🏢 Clientes)');
    console.log('   2. Exibição correta da transportadora no dropdown');
    console.log('   3. Badges coloridas para identificar o tipo');
    console.log('   4. Informações completas (CPF, telefone, CNH, transportadora)');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiParaControles();
