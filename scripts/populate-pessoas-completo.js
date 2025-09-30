const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function populatePessoasCompleto() {
  try {
    console.log('🔧 Populando banco com dados de teste completos...\n');

    // 1. Criar motoristas
    console.log('🚛 Criando motoristas...');
    const motoristas = [
      {
        nome: 'João Silva',
        telefone: '(11) 99999-1111',
        cpf: '12345678901',
        cnh: '12345678901',
        transportadoraId: 'ACCERT',
        tipo: 'MOTORISTA'
      },
      {
        nome: 'Pedro Santos',
        telefone: '(11) 99999-2222',
        cpf: '23456789012',
        cnh: '23456789012',
        transportadoraId: 'EXPRESSO_GOIAS',
        tipo: 'MOTORISTA'
      },
      {
        nome: 'Carlos Oliveira',
        telefone: '(11) 99999-3333',
        cpf: '34567890123',
        cnh: '34567890123',
        transportadoraId: 'TERCEIRIZADA',
        tipo: 'MOTORISTA'
      }
    ];

    for (const motorista of motoristas) {
      await prisma.motorista.create({ data: motorista });
      console.log(`   ✅ ${motorista.nome} - ${motorista.transportadoraId}`);
    }

    // 2. Criar funcionários
    console.log('\n👨‍💼 Criando funcionários...');
    const funcionarios = [
      {
        nome: 'Ana Costa',
        telefone: '(11) 99999-4444',
        cpf: '45678901234',
        cnh: null,
        transportadoraId: 'RETIRA_VENDEDOR',
        tipo: 'FUNCIONARIO'
      },
      {
        nome: 'Roberto Lima',
        telefone: '(11) 99999-5555',
        cpf: '56789012345',
        cnh: null,
        transportadoraId: 'RETIRA_VENDEDOR',
        tipo: 'FUNCIONARIO'
      }
    ];

    for (const funcionario of funcionarios) {
      await prisma.motorista.create({ data: funcionario });
      console.log(`   ✅ ${funcionario.nome} - ${funcionario.transportadoraId}`);
    }

    // 3. Criar clientes
    console.log('\n🏢 Criando clientes...');
    const clientes = [
      {
        nome: 'Empresa ABC Ltda',
        telefone: '(11) 99999-6666',
        cpf: '67890123456',
        cnh: null,
        transportadoraId: 'RETIRA_CLIENTE',
        tipo: 'CLIENTE'
      },
      {
        nome: 'Comércio XYZ',
        telefone: '(11) 99999-7777',
        cpf: '78901234567',
        cnh: null,
        transportadoraId: 'RETIRA_CLIENTE',
        tipo: 'CLIENTE'
      }
    ];

    for (const cliente of clientes) {
      await prisma.motorista.create({ data: cliente });
      console.log(`   ✅ ${cliente.nome} - ${cliente.transportadoraId}`);
    }

    // 4. Verificar resultado
    console.log('\n📊 Resultado final:');
    const todasPessoas = await prisma.motorista.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    const porTipo = {
      MOTORISTA: todasPessoas.filter(p => p.tipo === 'MOTORISTA'),
      FUNCIONARIO: todasPessoas.filter(p => p.tipo === 'FUNCIONARIO'),
      CLIENTE: todasPessoas.filter(p => p.tipo === 'CLIENTE')
    };

    console.log(`   Total: ${todasPessoas.length} pessoas`);
    console.log(`   Motoristas: ${porTipo.MOTORISTA.length}`);
    console.log(`   Funcionários: ${porTipo.FUNCIONARIO.length}`);
    console.log(`   Clientes: ${porTipo.CLIENTE.length}`);

    console.log('\n📋 Lista completa:');
    todasPessoas.forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                       pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      const cnh = pessoa.cnh ? ` - CNH: ${pessoa.cnh}` : '';
      console.log(`${index + 1}. ${pessoa.nome} (${tipoLabel}) - ${pessoa.transportadoraId}${cnh}`);
    });

    // 5. Testar filtros
    console.log('\n🧪 Testando filtros:');
    
    console.log('   Apenas motoristas:');
    const apenasMotoristas = await prisma.motorista.findMany({
      where: { tipo: 'MOTORISTA' }
    });
    apenasMotoristas.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nome} - ${m.transportadoraId} - CNH: ${m.cnh}`);
    });

    console.log('   Apenas funcionários:');
    const apenasFuncionarios = await prisma.motorista.findMany({
      where: { tipo: 'FUNCIONARIO' }
    });
    apenasFuncionarios.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.nome} - ${f.transportadoraId}`);
    });

    console.log('   Apenas clientes:');
    const apenasClientes = await prisma.motorista.findMany({
      where: { tipo: 'CLIENTE' }
    });
    apenasClientes.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.nome} - ${c.transportadoraId}`);
    });

    console.log('\n🎉 Banco populado com sucesso!');
    console.log('\n💡 Agora você pode:');
    console.log('   - Acessar /admin/motoristas (deve mostrar 3 motoristas)');
    console.log('   - Acessar /funcionarios (deve mostrar 2 funcionários)');
    console.log('   - Acessar /clientes (deve mostrar 2 clientes)');

  } catch (error) {
    console.error('❌ Erro ao popular banco:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populatePessoasCompleto();
