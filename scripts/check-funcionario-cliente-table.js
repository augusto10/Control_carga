const { PrismaClient } = require('@prisma/client');

async function checkFuncionarioClienteTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando se a tabela FuncionarioCliente existe...');
    
    // Verificar se a tabela existe
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'FuncionarioCliente'
    `;
    
    if (result.length > 0) {
      console.log('✅ Tabela FuncionarioCliente já existe!');
      
      // Contar registros
      try {
        const count = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "FuncionarioCliente"`;
        console.log(`📊 Registros na tabela: ${count[0].count}`);
      } catch (error) {
        console.log('⚠️  Tabela existe mas pode ter problemas de estrutura');
      }
      
      return true;
    } else {
      console.log('❌ Tabela FuncionarioCliente NÃO existe!');
      console.log('💡 Execute: node scripts/migrate-funcionario-cliente.js');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar tabela:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Executar a verificação
checkFuncionarioClienteTable()
  .then((exists) => {
    if (exists) {
      console.log('🎉 Sistema pronto para usar funcionários/clientes!');
    } else {
      console.log('⚠️  Migração necessária antes de usar o sistema.');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Erro na verificação:', error);
    process.exit(1);
  });
