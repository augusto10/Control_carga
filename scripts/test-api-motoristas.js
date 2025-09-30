const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testApiMotoristas() {
  try {
    console.log('🧪 Testando API de motoristas...\n');

    // 1. Testar diretamente no banco
    console.log('📊 Dados diretos do banco:');
    const todasPessoas = await prisma.motorista.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        transportadoraId: true,
        cnh: true
      },
      orderBy: { nome: 'asc' }
    });

    console.log(`Total de pessoas: ${todasPessoas.length}`);
    todasPessoas.forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo || 'SEM_TIPO';
      console.log(`${index + 1}. ${pessoa.nome} - Tipo: ${tipoLabel} - Transp: ${pessoa.transportadoraId} - CNH: ${pessoa.cnh || 'N/A'}`);
    });

    // 2. Simular filtro da API
    console.log('\n🔍 Simulando filtro da API de motoristas:');
    const motoristas = todasPessoas.filter(pessoa => 
      pessoa.tipo === 'MOTORISTA' || !pessoa.tipo // Incluir registros sem tipo (motoristas antigos)
    );

    console.log(`Motoristas encontrados: ${motoristas.length}`);
    motoristas.forEach((motorista, index) => {
      console.log(`${index + 1}. ${motorista.nome} - ${motorista.transportadoraId} - CNH: ${motorista.cnh || 'N/A'}`);
    });

    // 3. Verificar funcionários e clientes
    console.log('\n👥 Funcionários:');
    const funcionarios = todasPessoas.filter(p => p.tipo === 'FUNCIONARIO');
    funcionarios.forEach((func, index) => {
      console.log(`${index + 1}. ${func.nome} - ${func.transportadoraId}`);
    });

    console.log('\n🏢 Clientes:');
    const clientes = todasPessoas.filter(p => p.tipo === 'CLIENTE');
    clientes.forEach((cliente, index) => {
      console.log(`${index + 1}. ${cliente.nome} - ${cliente.transportadoraId}`);
    });

    // 4. Verificar se há motoristas sem tipo definido
    const semTipo = todasPessoas.filter(p => !p.tipo);
    if (semTipo.length > 0) {
      console.log('\n⚠️ Pessoas sem tipo definido (serão tratadas como motoristas):');
      semTipo.forEach((pessoa, index) => {
        console.log(`${index + 1}. ${pessoa.nome} - ${pessoa.transportadoraId} - CNH: ${pessoa.cnh || 'N/A'}`);
      });

      // Atualizar para tipo MOTORISTA
      console.log('\n🔄 Atualizando pessoas sem tipo para MOTORISTA...');
      for (const pessoa of semTipo) {
        await prisma.motorista.update({
          where: { id: pessoa.id },
          data: { tipo: 'MOTORISTA' }
        });
        console.log(`   ✅ ${pessoa.nome} → MOTORISTA`);
      }
    }

    console.log('\n🎉 Teste concluído!');
    console.log('\n💡 Resultado esperado na API /api/motoristas:');
    console.log(`   - Deve retornar ${motoristas.length + semTipo.length} motoristas`);
    console.log('   - Funcionários e clientes não devem aparecer');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testApiMotoristas();
