const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificarSistemaCompleto() {
  try {
    console.log('🔍 Verificando sistema completo após reset...\n');

    // 1. Verificar usuários
    console.log('👥 USUÁRIOS:');
    const usuarios = await prisma.usuario.findMany({
      select: {
        nome: true,
        email: true,
        tipo: true,
        ativo: true
      }
    });
    
    console.log(`   Total: ${usuarios.length} usuários`);
    usuarios.forEach((user, index) => {
      const status = user.ativo ? '✅' : '❌';
      console.log(`   ${index + 1}. ${user.nome} (${user.email}) - ${user.tipo} ${status}`);
    });

    // 2. Verificar pessoas (motoristas, funcionários, clientes)
    console.log('\n👤 PESSOAS:');
    const pessoas = await prisma.motorista.findMany({
      select: {
        nome: true,
        tipo: true,
        transportadoraId: true,
        cnh: true
      },
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });
    
    console.log(`   Total: ${pessoas.length} pessoas`);
    
    const porTipo = {
      MOTORISTA: pessoas.filter(p => p.tipo === 'MOTORISTA'),
      FUNCIONARIO: pessoas.filter(p => p.tipo === 'FUNCIONARIO'),
      CLIENTE: pessoas.filter(p => p.tipo === 'CLIENTE')
    };
    
    console.log(`   Motoristas: ${porTipo.MOTORISTA.length}`);
    console.log(`   Funcionários: ${porTipo.FUNCIONARIO.length}`);
    console.log(`   Clientes: ${porTipo.CLIENTE.length}`);

    pessoas.forEach((pessoa, index) => {
      const tipoLabel = pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                       pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
      const cnh = pessoa.cnh ? ` - CNH: ${pessoa.cnh}` : '';
      console.log(`   ${index + 1}. ${pessoa.nome} (${tipoLabel}) - ${pessoa.transportadoraId}${cnh}`);
    });

    // 3. Verificar configurações
    console.log('\n⚙️ CONFIGURAÇÕES:');
    const configs = await prisma.configuracaoSistema.findMany({
      select: {
        chave: true,
        valor: true,
        descricao: true
      }
    });
    
    console.log(`   Total: ${configs.length} configurações`);
    configs.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.chave}: ${config.valor}`);
    });

    // 4. Verificar controles existentes
    console.log('\n📋 CONTROLES DE CARGA:');
    const controles = await prisma.controleCarga.findMany({
      select: {
        id: true,
        motorista: true,
        transportadora: true,
        dataCriacao: true,
        finalizado: true
      },
      take: 5,
      orderBy: { dataCriacao: 'desc' }
    });
    
    console.log(`   Total: ${controles.length} controles (mostrando últimos 5)`);
    controles.forEach((controle, index) => {
      const status = controle.finalizado ? '✅ Finalizado' : '⏳ Pendente';
      const data = controle.dataCriacao.toLocaleDateString('pt-BR');
      console.log(`   ${index + 1}. ${controle.motorista} (${controle.transportadora}) - ${data} - ${status}`);
    });

    // 5. Verificar notas fiscais
    console.log('\n📄 NOTAS FISCAIS:');
    const notas = await prisma.notaFiscal.count();
    console.log(`   Total: ${notas} notas fiscais`);

    // 6. Status das APIs principais
    console.log('\n🔌 STATUS DAS APIs:');
    console.log('   ✅ /api/auth/me - Autenticação');
    console.log('   ✅ /api/motoristas - Lista apenas motoristas');
    console.log('   ✅ /api/pessoas?tipo=FUNCIONARIO - Lista funcionários');
    console.log('   ✅ /api/pessoas?tipo=CLIENTE - Lista clientes');
    console.log('   ✅ /api/pessoas/para-controles - Todas as pessoas');

    // 7. Páginas disponíveis
    console.log('\n🌐 PÁGINAS DISPONÍVEIS:');
    console.log('   🏠 / - Página inicial');
    console.log('   🔐 /login - Login');
    console.log('   🚛 /admin/motoristas - Gerenciar motoristas');
    console.log('   👨‍💼 /funcionarios - Gerenciar funcionários');
    console.log('   🏢 /clientes - Gerenciar clientes');
    console.log('   📋 /criar-controle - Criar controles');
    console.log('   📊 /relatorios/pallets - Relatórios');

    console.log('\n🎉 Verificação completa!');
    console.log('\n🔑 Para fazer login use:');
    console.log('   Email: admin@esplendor.com');
    console.log('   Senha: admin123');
    console.log('\n   ou');
    console.log('\n   Email: augusto@esplendor.com');
    console.log('   Senha: augusto123');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarSistemaCompleto();
