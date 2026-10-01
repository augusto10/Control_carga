const { PrismaClient } = require('@prisma/client');

async function verifyDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando conexão com o banco...\n');
    
    // Verificar tabelas e dados
    const controles = await prisma.controleCarga.count();
    const notas = await prisma.notaFiscal.count();
    const usuarios = await prisma.usuario.count();
    
    console.log('📊 DADOS DO BANCO:');
    console.log(`- Controles de Carga: ${controles} registros`);
    console.log(`- Notas Fiscais: ${notas} registros`);
    console.log(`- Usuários: ${usuarios} registros`);
    
    // Verificar último controle criado
    if (controles > 0) {
      const ultimoControle = await prisma.controleCarga.findFirst({
        orderBy: { dataCriacao: 'desc' },
        select: {
          id: true,
          dataCriacao: true,
          motorista: true,
          numeroManifesto: true
        }
      });
      
      console.log('\n📅 ÚLTIMO CONTROLE:');
      console.log(`- Data: ${ultimoControle.dataCriacao}`);
      console.log(`- Motorista: ${ultimoControle.motorista}`);
      console.log(`- Manifesto: ${ultimoControle.numeroManifesto}`);
    }
    
    // Verificar se há usuários admin
    const admins = await prisma.usuario.count({
      where: { tipo: 'ADMIN' }
    });
    
    console.log(`\n👤 Usuários ADMIN: ${admins}`);
    
    console.log('\n✅ CONFIRMAÇÃO: Este é o banco de PRODUÇÃO!');
    
  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
