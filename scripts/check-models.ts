import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Modelos disponíveis no Prisma Client:');
    console.log(Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_')))    
    
    // Verificar se o modelo pedidoConferido existe
    console.log('\nVerificando se o modelo pedidoConferido existe...');
    console.log('pedidoConferido' in prisma ? '✅ Modelo encontrado' : '❌ Modelo não encontrado');
    
    // Listar todos os métodos disponíveis no modelo
    if ('pedidoConferido' in prisma) {
      console.log('\nMétodos disponíveis em pedidoConferido:');
      console.log(Object.keys((prisma as any).pedidoConferido));
      
      // Tentar contar os registros
      try {
        const count = await (prisma as any).pedidoConferido.count();
        console.log(`\nTotal de registros em PedidoConferido: ${count}`);
      } catch (countError) {
        console.error('\nErro ao contar registros de PedidoConferido:', (countError as Error).message);
      }
    }
    
  } catch (error) {
    console.error('Erro ao verificar o Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
