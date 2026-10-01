const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPessoasSistema() {
  try {
    console.log('🧪 Testando sistema de pessoas (Motoristas, Funcionários e Clientes)...\n');

    // 1. Verificar se existem motoristas atuais
    const motoristasExistentes = await prisma.motorista.count();
    console.log(`📊 Total de pessoas no banco: ${motoristasExistentes}`);

    if (motoristasExistentes > 0) {
      // 2. Verificar se já têm o campo tipo
      const pessoasComTipo = await prisma.motorista.findMany({
        select: {
          id: true,
          nome: true,
          tipo: true,
          cnh: true
        },
        take: 5
      });

      console.log('\n📋 Primeiras 5 pessoas no banco:');
      pessoasComTipo.forEach((pessoa, index) => {
        console.log(`${index + 1}. ${pessoa.nome} - Tipo: ${pessoa.tipo} - CNH: ${pessoa.cnh || 'N/A'}`);
      });

      // 3. Contar por tipo
      const tipoStats = await prisma.motorista.groupBy({
        by: ['tipo'],
        _count: {
          tipo: true
        }
      });

      console.log('\n📈 Distribuição por tipo:');
      tipoStats.forEach(stat => {
        const tipoLabel = stat.tipo === 'MOTORISTA' ? 'Motoristas' : 
                         stat.tipo === 'FUNCIONARIO' ? 'Funcionários' : 'Clientes';
        console.log(`   ${tipoLabel}: ${stat._count.tipo}`);
      });
    }

    // 4. Criar exemplos de cada tipo se não existirem
    console.log('\n🔧 Verificando se precisamos criar exemplos...');
    
    const funcionarios = await prisma.motorista.count({ where: { tipo: 'FUNCIONARIO' } });
    const clientes = await prisma.motorista.count({ where: { tipo: 'CLIENTE' } });

    if (funcionarios === 0) {
      console.log('   📝 Criando funcionário de exemplo...');
      await prisma.motorista.create({
        data: {
          nome: 'João Silva',
          telefone: '(11) 99999-1111',
          cpf: '12345678901',
          cnh: null, // Funcionários não precisam de CNH
          transportadoraId: 'ACCERT',
          tipo: 'FUNCIONARIO'
        }
      });
      console.log('   ✅ Funcionário criado!');
    }

    if (clientes === 0) {
      console.log('   📝 Criando cliente de exemplo...');
      await prisma.motorista.create({
        data: {
          nome: 'Maria Santos',
          telefone: '(11) 99999-2222',
          cpf: '98765432109',
          cnh: null, // Clientes não precisam de CNH
          transportadoraId: 'EXPRESSO_GOIAS',
          tipo: 'CLIENTE'
        }
      });
      console.log('   ✅ Cliente criado!');
    }

    // 5. Testar busca para controles
    console.log('\n🔍 Testando busca para controles...');
    const todasPessoas = await prisma.motorista.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    const agrupadas = {
      motoristas: todasPessoas.filter(p => p.tipo === 'MOTORISTA'),
      funcionarios: todasPessoas.filter(p => p.tipo === 'FUNCIONARIO'),
      clientes: todasPessoas.filter(p => p.tipo === 'CLIENTE')
    };

    console.log(`   Motoristas: ${agrupadas.motoristas.length}`);
    console.log(`   Funcionários: ${agrupadas.funcionarios.length}`);
    console.log(`   Clientes: ${agrupadas.clientes.length}`);

    // 6. Mostrar como aparecerá no dropdown
    console.log('\n📋 Como aparecerá no dropdown de controles:');
    todasPessoas.slice(0, 5).forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                       pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      const displayName = `${pessoa.nome} (${tipoLabel})`;
      console.log(`${index + 1}. ${displayName}`);
    });

    console.log('\n🎉 Sistema de pessoas funcionando corretamente!');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Acesse /funcionarios para gerenciar funcionários');
    console.log('   2. Acesse /clientes para gerenciar clientes');
    console.log('   3. Ao criar controles, agora você pode selecionar entre motoristas, funcionários e clientes');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPessoasSistema();
