const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupTransportadorasPessoas() {
  try {
    console.log('🔧 Configurando transportadoras para pessoas...\n');

    // 1. Verificar pessoas existentes
    const todasPessoas = await prisma.motorista.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        transportadoraId: true
      }
    });

    console.log(`📊 Total de pessoas no banco: ${todasPessoas.length}`);

    // 2. Agrupar por tipo
    const porTipo = {
      MOTORISTA: todasPessoas.filter(p => p.tipo === 'MOTORISTA'),
      FUNCIONARIO: todasPessoas.filter(p => p.tipo === 'FUNCIONARIO'),
      CLIENTE: todasPessoas.filter(p => p.tipo === 'CLIENTE')
    };

    console.log(`   Motoristas: ${porTipo.MOTORISTA.length}`);
    console.log(`   Funcionários: ${porTipo.FUNCIONARIO.length}`);
    console.log(`   Clientes: ${porTipo.CLIENTE.length}`);

    // 3. Atualizar funcionários para RETIRA_VENDEDOR
    if (porTipo.FUNCIONARIO.length > 0) {
      console.log('\n🔄 Atualizando funcionários para RETIRA_VENDEDOR...');
      
      for (const funcionario of porTipo.FUNCIONARIO) {
        if (funcionario.transportadoraId !== 'RETIRA_VENDEDOR') {
          await prisma.motorista.update({
            where: { id: funcionario.id },
            data: { transportadoraId: 'RETIRA_VENDEDOR' }
          });
          console.log(`   ✅ ${funcionario.nome}: ${funcionario.transportadoraId} → RETIRA_VENDEDOR`);
        } else {
          console.log(`   ✓ ${funcionario.nome}: já está como RETIRA_VENDEDOR`);
        }
      }
    }

    // 4. Atualizar clientes para RETIRA_CLIENTE
    if (porTipo.CLIENTE.length > 0) {
      console.log('\n🔄 Atualizando clientes para RETIRA_CLIENTE...');
      
      for (const cliente of porTipo.CLIENTE) {
        if (cliente.transportadoraId !== 'RETIRA_CLIENTE') {
          await prisma.motorista.update({
            where: { id: cliente.id },
            data: { transportadoraId: 'RETIRA_CLIENTE' }
          });
          console.log(`   ✅ ${cliente.nome}: ${cliente.transportadoraId} → RETIRA_CLIENTE`);
        } else {
          console.log(`   ✓ ${cliente.nome}: já está como RETIRA_CLIENTE`);
        }
      }
    }

    // 5. Criar exemplos se não existirem
    console.log('\n🆕 Verificando se precisamos criar exemplos...');

    if (porTipo.FUNCIONARIO.length === 0) {
      console.log('   📝 Criando funcionário de exemplo...');
      await prisma.motorista.create({
        data: {
          nome: 'João Silva (Funcionário)',
          telefone: '(11) 99999-1111',
          cpf: '11111111111',
          cnh: null,
          transportadoraId: 'RETIRA_VENDEDOR',
          tipo: 'FUNCIONARIO'
        }
      });
      console.log('   ✅ Funcionário criado com RETIRA_VENDEDOR!');
    }

    if (porTipo.CLIENTE.length === 0) {
      console.log('   📝 Criando cliente de exemplo...');
      await prisma.motorista.create({
        data: {
          nome: 'Maria Santos (Cliente)',
          telefone: '(11) 99999-2222',
          cpf: '22222222222',
          cnh: null,
          transportadoraId: 'RETIRA_CLIENTE',
          tipo: 'CLIENTE'
        }
      });
      console.log('   ✅ Cliente criado com RETIRA_CLIENTE!');
    }

    // 6. Verificar resultado final
    console.log('\n📋 Resultado final:');
    const pessoasAtualizadas = await prisma.motorista.findMany({
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

    pessoasAtualizadas.forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                       pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      console.log(`${index + 1}. ${pessoa.nome} (${tipoLabel}) - ${pessoa.transportadoraId}`);
    });

    // 7. Testar API de motoristas
    console.log('\n🧪 Testando filtro de motoristas...');
    const apenasMotoristas = await prisma.motorista.findMany({
      where: { tipo: 'MOTORISTA' },
      select: { nome: true, transportadoraId: true }
    });

    console.log(`   📊 Motoristas encontrados: ${apenasMotoristas.length}`);
    apenasMotoristas.forEach((motorista, index) => {
      console.log(`   ${index + 1}. ${motorista.nome} - ${motorista.transportadoraId}`);
    });

    console.log('\n🎉 Configuração concluída!');
    console.log('\n💡 Agora:');
    console.log('   - Funcionários usam RETIRA_VENDEDOR por padrão');
    console.log('   - Clientes usam RETIRA_CLIENTE por padrão');
    console.log('   - API de motoristas mostra apenas pessoas do tipo MOTORISTA');

  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTransportadorasPessoas();
