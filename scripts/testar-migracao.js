const { PrismaClient } = require('@prisma/client');

async function testarMigracao() {
  console.log('🧪 [TESTE] Testando se migração funcionou...');
  
  let prisma;
  
  try {
    // Conectar ao banco usando a URL de produção
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não configurada!');
    }
    
    console.log('📡 [TESTE] Conectando ao banco...');
    
    // Criar cliente Prisma com URL direta (sem Accelerate)
    const directUrl = databaseUrl.replace('prisma://', 'postgresql://');
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: directUrl
        }
      }
    });
    
    await prisma.$connect();
    console.log('✅ [TESTE] Conectado com sucesso!');
    
    // TESTE 1: Campo tipo existe e funciona
    console.log('\n🔍 [TESTE 1] Testando campo "tipo"...');
    try {
      const motoristas = await prisma.motorista.findMany({
        select: { 
          id: true, 
          nome: true, 
          tipo: true,
          transportadoraId: true,
          cnh: true
        },
        take: 5
      });
      
      console.log('✅ [TESTE 1] Campo "tipo" funcionando!');
      console.log(`📊 [TESTE 1] Encontrados ${motoristas.length} registros:`);
      
      motoristas.forEach((m, index) => {
        console.log(`   ${index + 1}. ${m.nome} - Tipo: ${m.tipo} - Transportadora: ${m.transportadoraId} - CNH: ${m.cnh || 'N/A'}`);
      });
      
    } catch (error) {
      console.error('❌ [TESTE 1] Campo "tipo" não funciona:', error.message);
      return false;
    }
    
    // TESTE 2: Enum Transportadora com ACCERT e RETIRA_CLIENTE
    console.log('\n🔍 [TESTE 2] Testando enum Transportadora...');
    try {
      // Testar se consegue buscar por ACCERT
      const controlesAccert = await prisma.controleCarga.count({
        where: { transportadora: 'ACCERT' }
      });
      
      console.log(`✅ [TESTE 2] ACCERT funciona - ${controlesAccert} controles encontrados`);
      
      // Testar se consegue buscar por RETIRA_CLIENTE
      const controlesRetiraCliente = await prisma.controleCarga.count({
        where: { transportadora: 'RETIRA_CLIENTE' }
      });
      
      console.log(`✅ [TESTE 2] RETIRA_CLIENTE funciona - ${controlesRetiraCliente} controles encontrados`);
      
    } catch (error) {
      console.error('❌ [TESTE 2] Enum Transportadora com problema:', error.message);
      return false;
    }
    
    // TESTE 3: CNH opcional
    console.log('\n🔍 [TESTE 3] Testando CNH opcional...');
    try {
      const pessoasSemCnh = await prisma.motorista.count({
        where: { cnh: null }
      });
      
      console.log(`✅ [TESTE 3] CNH opcional funciona - ${pessoasSemCnh} pessoas sem CNH`);
      
    } catch (error) {
      console.error('❌ [TESTE 3] CNH opcional com problema:', error.message);
      return false;
    }
    
    // TESTE 4: Contagem geral
    console.log('\n📊 [ESTATÍSTICAS] Dados no banco:');
    try {
      const totalMotoristas = await prisma.motorista.count();
      const totalControles = await prisma.controleCarga.count();
      const totalNotas = await prisma.notaFiscal.count();
      
      console.log(`   - Motoristas/Pessoas: ${totalMotoristas}`);
      console.log(`   - Controles: ${totalControles}`);
      console.log(`   - Notas: ${totalNotas}`);
      
    } catch (error) {
      console.error('❌ [ESTATÍSTICAS] Erro ao contar:', error.message);
    }
    
    console.log('\n🎉 [TESTE] Todos os testes passaram! Migração bem-sucedida!');
    console.log('🚀 [TESTE] Aplicação deve funcionar normalmente em produção!');
    
    return true;
    
  } catch (error) {
    console.error('💥 [TESTE] Erro durante teste:', error);
    return false;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('📡 [TESTE] Desconectado do banco');
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testarMigracao()
    .then((sucesso) => {
      if (sucesso) {
        console.log('\n✅ MIGRAÇÃO FUNCIONOU! Aplicação deve estar operacional!');
        process.exit(0);
      } else {
        console.log('\n❌ MIGRAÇÃO COM PROBLEMAS! Verifique os erros acima!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 TESTE FALHOU:', error);
      process.exit(1);
    });
}

module.exports = { testarMigracao };
