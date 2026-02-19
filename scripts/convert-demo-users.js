// Script para converter usuários DEMO em USUARIO
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Primeiro, pegar backup dos registros que serão alterados
    console.log('Buscando usuários DEMO para alterar...');
    const demosAntes = await prisma.$queryRaw`
      SELECT id, nome, email, tipo, "dataCriacao"
      FROM "Usuario"
      WHERE tipo = 'DEMO'`;
    
    if (!demosAntes || demosAntes.length === 0) {
      console.log('Nenhum usuário DEMO encontrado para converter.');
      return;
    }
    
    console.log('\nUsuários que serão alterados:');
    console.table(demosAntes);
    
    // Fazer o update dentro de uma transação
    const result = await prisma.$executeRaw`
      UPDATE "Usuario"
      SET tipo = 'USUARIO'
      WHERE tipo = 'DEMO'`;
    
    console.log(`\n✅ ${result} registro(s) atualizado(s) com sucesso.`);
    
    // Verificar resultado
    const alterados = await prisma.$queryRaw`
      SELECT id, nome, email, tipo
      FROM "Usuario"
      WHERE id IN (${prisma.Prisma.join(demosAntes.map(d => d.id))})`;
    
    console.log('\nRegistros após atualização:');
    console.table(alterados);
    
  } catch (error) {
    console.error('Erro ao atualizar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();