const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSelecaoFinal() {
  try {
    console.log('🧪 Teste final da seleção automática...\n');

    // 1. Buscar pessoas como a API faz
    const pessoas = await prisma.motorista.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    // 2. Formatar como a API faz
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

    console.log('📊 Pessoas formatadas para o dropdown:');
    pessoasFormatadas.forEach((pessoa, index) => {
      const tipoIcon = pessoa.tipo === 'MOTORISTA' ? '🚛' : 
                      pessoa.tipo === 'FUNCIONARIO' ? '👨‍💼' : '🏢';
      console.log(`${index + 1}. ${tipoIcon} ${pessoa.displayName}`);
      console.log(`   Transportadora: ${pessoa.transportadoraId}`);
    });

    // 3. Testar casos específicos
    console.log('\n🎯 Testando casos específicos:');
    
    // Motorista ACCERT
    const motoristaAccert = pessoasFormatadas.find(p => p.tipo === 'MOTORISTA' && p.transportadoraId === 'ACCERT');
    if (motoristaAccert) {
      console.log(`✅ Motorista ACCERT encontrado: ${motoristaAccert.nome}`);
      console.log(`   Ao selecionar: transportadora = "${motoristaAccert.transportadoraId}"`);
    } else {
      console.log('❌ Nenhum motorista ACCERT encontrado');
    }

    // Cliente RETIRA_CLIENTE
    const clienteRetiraCliente = pessoasFormatadas.find(p => p.tipo === 'CLIENTE' && p.transportadoraId === 'RETIRA_CLIENTE');
    if (clienteRetiraCliente) {
      console.log(`✅ Cliente RETIRA_CLIENTE encontrado: ${clienteRetiraCliente.nome}`);
      console.log(`   Ao selecionar: transportadora = "${clienteRetiraCliente.transportadoraId}"`);
    } else {
      console.log('❌ Nenhum cliente RETIRA_CLIENTE encontrado');
    }

    // 4. Verificar enum válido
    console.log('\n📋 Verificando enum Transportadora:');
    const enumValidos = ['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE'];
    
    const transportadorasUsadas = [...new Set(pessoasFormatadas.map(p => p.transportadoraId))];
    transportadorasUsadas.forEach(transp => {
      const valido = enumValidos.includes(transp);
      console.log(`   ${transp}: ${valido ? '✅ Válido' : '❌ Inválido'}`);
    });

    // 5. Simular seleção no componente
    console.log('\n🔄 Simulando seleção no componente:');
    
    if (motoristaAccert) {
      console.log(`\nSelecionando: ${motoristaAccert.nome} (Motorista)`);
      console.log('Dados que serão definidos no formData:');
      console.log(`   motorista: "${motoristaAccert.nome}"`);
      console.log(`   cpfMotorista: "${motoristaAccert.cpf}"`);
      console.log(`   telefoneMotorista: "${motoristaAccert.telefone || ''}"`);
      console.log(`   transportadora: "${motoristaAccert.transportadoraId}" ← ACCERT`);
    }

    if (clienteRetiraCliente) {
      console.log(`\nSelecionando: ${clienteRetiraCliente.nome} (Cliente)`);
      console.log('Dados que serão definidos no formData:');
      console.log(`   motorista: "${clienteRetiraCliente.nome}"`);
      console.log(`   cpfMotorista: "${clienteRetiraCliente.cpf}"`);
      console.log(`   telefoneMotorista: "${clienteRetiraCliente.telefone || ''}"`);
      console.log(`   transportadora: "${clienteRetiraCliente.transportadoraId}" ← RETIRA_CLIENTE`);
    }

    console.log('\n🎉 Teste concluído!');
    console.log('\n💡 Para testar no navegador:');
    console.log('   1. Acesse http://localhost:3000/criar-controle');
    console.log('   2. Clique no dropdown "Pessoa Responsável"');
    console.log('   3. Selecione João Silva (Motorista) → deve vir ACCERT automaticamente');
    console.log('   4. Selecione um Cliente → deve vir RETIRA_CLIENTE automaticamente');
    console.log('   5. Verifique o console do navegador para logs de debug');

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSelecaoFinal();
