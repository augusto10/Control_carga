const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugTransportadorasCompleto() {
  try {
    console.log('🔍 Debug completo das transportadoras...\n');

    // 1. Verificar dados no banco
    const pessoas = await prisma.motorista.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        transportadoraId: true,
        cpf: true,
        telefone: true,
        cnh: true
      },
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    console.log('📊 Dados no banco:');
    pessoas.forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                       pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      console.log(`${index + 1}. ${pessoa.nome} (${tipoLabel})`);
      console.log(`   Transportadora: ${pessoa.transportadoraId}`);
      console.log(`   CPF: ${pessoa.cpf}`);
      console.log(`   Telefone: ${pessoa.telefone || 'N/A'}`);
      console.log(`   CNH: ${pessoa.cnh || 'N/A'}`);
      console.log('');
    });

    // 2. Verificar problemas específicos
    console.log('🔍 Verificações específicas:');
    
    // ACCERT
    const accertPessoas = pessoas.filter(p => p.transportadoraId === 'ACCERT');
    console.log(`\n🚛 ACCERT: ${accertPessoas.length} pessoas`);
    accertPessoas.forEach(p => {
      console.log(`   - ${p.nome} (${p.tipo})`);
    });

    // RETIRA_CLIENTE
    const retiraClientePessoas = pessoas.filter(p => p.transportadoraId === 'RETIRA_CLIENTE');
    console.log(`\n🏢 RETIRA_CLIENTE: ${retiraClientePessoas.length} pessoas`);
    retiraClientePessoas.forEach(p => {
      console.log(`   - ${p.nome} (${p.tipo})`);
    });

    // Clientes sem RETIRA_CLIENTE
    const clientes = pessoas.filter(p => p.tipo === 'CLIENTE');
    const clientesSemRetiraCliente = clientes.filter(c => c.transportadoraId !== 'RETIRA_CLIENTE');
    
    console.log(`\n❌ Clientes sem RETIRA_CLIENTE: ${clientesSemRetiraCliente.length}`);
    clientesSemRetiraCliente.forEach(c => {
      console.log(`   - ${c.nome}: ${c.transportadoraId} (deveria ser RETIRA_CLIENTE)`);
    });

    // 3. Corrigir clientes se necessário
    if (clientesSemRetiraCliente.length > 0) {
      console.log('\n🔧 Corrigindo clientes...');
      for (const cliente of clientesSemRetiraCliente) {
        await prisma.motorista.update({
          where: { id: cliente.id },
          data: { transportadoraId: 'RETIRA_CLIENTE' }
        });
        console.log(`   ✅ ${cliente.nome} → RETIRA_CLIENTE`);
      }
    }

    // 4. Verificar motoristas com ACCERT
    const motoristas = pessoas.filter(p => p.tipo === 'MOTORISTA');
    const motoristasAccert = motoristas.filter(m => m.transportadoraId === 'ACCERT');
    
    console.log(`\n🚛 Motoristas com ACCERT: ${motoristasAccert.length}`);
    if (motoristasAccert.length === 0) {
      console.log('⚠️ Nenhum motorista com ACCERT! Criando um...');
      
      // Verificar se João Silva existe
      const joaoSilva = pessoas.find(p => p.nome.includes('João Silva'));
      if (joaoSilva && joaoSilva.tipo === 'MOTORISTA') {
        await prisma.motorista.update({
          where: { id: joaoSilva.id },
          data: { transportadoraId: 'ACCERT' }
        });
        console.log(`   ✅ ${joaoSilva.nome} → ACCERT`);
      } else {
        // Criar novo motorista ACCERT
        await prisma.motorista.create({
          data: {
            nome: 'João Silva',
            telefone: '(11) 99999-1111',
            cpf: '11111111111',
            cnh: '12345678901',
            transportadoraId: 'ACCERT',
            tipo: 'MOTORISTA'
          }
        });
        console.log('   ✅ Novo motorista João Silva criado com ACCERT');
      }
    }

    // 5. Resultado final
    console.log('\n📊 Resultado final:');
    const pessoasFinais = await prisma.motorista.findMany({
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

    const porTipo = {
      MOTORISTA: pessoasFinais.filter(p => p.tipo === 'MOTORISTA'),
      FUNCIONARIO: pessoasFinais.filter(p => p.tipo === 'FUNCIONARIO'),
      CLIENTE: pessoasFinais.filter(p => p.tipo === 'CLIENTE')
    };

    console.log(`🚛 Motoristas (${porTipo.MOTORISTA.length}):`);
    porTipo.MOTORISTA.forEach((m, i) => {
      console.log(`   ${i + 1}. ${m.nome} - ${m.transportadoraId}`);
    });

    console.log(`\n👨‍💼 Funcionários (${porTipo.FUNCIONARIO.length}):`);
    porTipo.FUNCIONARIO.forEach((f, i) => {
      console.log(`   ${i + 1}. ${f.nome} - ${f.transportadoraId}`);
    });

    console.log(`\n🏢 Clientes (${porTipo.CLIENTE.length}):`);
    porTipo.CLIENTE.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.nome} - ${c.transportadoraId}`);
    });

    // 6. Verificar se há controles para testar assinaturas
    console.log('\n📋 Verificando controles para teste de assinaturas:');
    const controles = await prisma.controleCarga.findMany({
      select: {
        id: true,
        motorista: true,
        transportadora: true,
        assinaturaMotorista: true,
        assinaturaResponsavel: true,
        finalizado: true
      },
      take: 5,
      orderBy: { dataCriacao: 'desc' }
    });

    console.log(`Total de controles: ${controles.length}`);
    controles.forEach((controle, index) => {
      const temAssinaturaMotorista = !!controle.assinaturaMotorista;
      const temAssinaturaResponsavel = !!controle.assinaturaResponsavel;
      const status = controle.finalizado ? 'Finalizado' : 'Pendente';
      
      console.log(`${index + 1}. ${controle.motorista} (${controle.transportadora})`);
      console.log(`   Motorista: ${temAssinaturaMotorista ? '✅' : '❌'} | Responsável: ${temAssinaturaResponsavel ? '✅' : '❌'} | ${status}`);
    });

    console.log('\n🎉 Debug concluído!');

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTransportadorasCompleto();
