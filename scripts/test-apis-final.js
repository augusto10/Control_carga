const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApisFinal() {
  try {
    console.log('🧪 Testando todas as APIs...\n');

    // 1. Testar API motoristas
    console.log('🚛 Testando API motoristas:');
    const motoristas = await prisma.motorista.findMany({
      where: { tipo: 'MOTORISTA' },
      orderBy: { nome: 'asc' }
    });
    
    console.log(`   Encontrados: ${motoristas.length} motoristas`);
    motoristas.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nome} - ${m.transportadoraId} - CNH: ${m.cnh}`);
    });

    // 2. Testar API funcionários
    console.log('\n👨‍💼 Testando API funcionários:');
    const funcionarios = await prisma.motorista.findMany({
      where: { tipo: 'FUNCIONARIO' },
      orderBy: { nome: 'asc' }
    });
    
    console.log(`   Encontrados: ${funcionarios.length} funcionários`);
    funcionarios.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.nome} - ${f.transportadoraId} - CNH: ${f.cnh || 'N/A'}`);
    });

    // 3. Testar API clientes
    console.log('\n🏢 Testando API clientes:');
    const clientes = await prisma.motorista.findMany({
      where: { tipo: 'CLIENTE' },
      orderBy: { nome: 'asc' }
    });
    
    console.log(`   Encontrados: ${clientes.length} clientes`);
    clientes.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.nome} - ${c.transportadoraId} - CNH: ${c.cnh || 'N/A'}`);
    });

    // 4. Testar API para controles (todas as pessoas)
    console.log('\n🔄 Testando API para controles (todas as pessoas):');
    const todasPessoas = await prisma.motorista.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });
    
    console.log(`   Total: ${todasPessoas.length} pessoas`);
    todasPessoas.forEach((p, i) => {
      const tipoLabel = p.tipo === 'MOTORISTA' ? 'Motorista' : 
                       p.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      const displayName = `${p.nome} (${tipoLabel})`;
      console.log(`   ${i + 1}. ${displayName} - ${p.transportadoraId}`);
    });

    // 5. Verificar transportadoras por tipo
    console.log('\n📊 Verificação de transportadoras por tipo:');
    
    const motoristaTransp = [...new Set(motoristas.map(m => m.transportadoraId))];
    const funcionarioTransp = [...new Set(funcionarios.map(f => f.transportadoraId))];
    const clienteTransp = [...new Set(clientes.map(c => c.transportadoraId))];
    
    console.log(`   Motoristas usam: ${motoristaTransp.join(', ')}`);
    console.log(`   Funcionários usam: ${funcionarioTransp.join(', ')}`);
    console.log(`   Clientes usam: ${clienteTransp.join(', ')}`);

    // 6. Verificar CNH por tipo
    console.log('\n🆔 Verificação de CNH por tipo:');
    const motoristasComCNH = motoristas.filter(m => m.cnh).length;
    const funcionariosComCNH = funcionarios.filter(f => f.cnh).length;
    const clientesComCNH = clientes.filter(c => c.cnh).length;
    
    console.log(`   Motoristas com CNH: ${motoristasComCNH}/${motoristas.length}`);
    console.log(`   Funcionários com CNH: ${funcionariosComCNH}/${funcionarios.length}`);
    console.log(`   Clientes com CNH: ${clientesComCNH}/${clientes.length}`);

    console.log('\n🎉 Teste concluído!');
    console.log('\n✅ Status das APIs:');
    console.log('   - /api/motoristas: Deve retornar apenas motoristas');
    console.log('   - /api/pessoas?tipo=FUNCIONARIO: Deve retornar apenas funcionários');
    console.log('   - /api/pessoas?tipo=CLIENTE: Deve retornar apenas clientes');
    console.log('   - /api/pessoas/para-controles: Deve retornar todas as pessoas organizadas');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApisFinal();
