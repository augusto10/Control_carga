import { PrismaClient } from '@prisma/client';

async function checkPrisma() {
  const prisma = new PrismaClient();
  
  try {
    // Verificar se o modelo PedidoConferido está disponível
    console.log('Modelos disponíveis no Prisma Client:');
    console.log(Object.keys(prisma).filter(key => !key.startsWith('_')));
    
    // Verificar se o modelo PedidoConferido existe
    console.log('\nVerificando se o modelo PedidoConferido existe...');
    console.log('pedidoConferido' in prisma ? '✅ Modelo encontrado' : '❌ Modelo não encontrado');
    
    // Tentar contar os registros
    try {
      const count = await (prisma as any).pedidoConferido.count();
      console.log(`\nTotal de registros em PedidoConferido: ${count}`);
    } catch (countError) {
      console.error('\nErro ao contar registros de PedidoConferido:', (countError as Error).message);
    }
    
    // Verificar a estrutura do modelo
    console.log('\nEstrutura do modelo PedidoConferido:');
    console.log(Object.keys((prisma as any).pedidoConferido).filter(key => typeof (prisma as any).pedidoConferido[key] === 'function'));
    
  } catch (error) {
    console.error('Erro ao verificar o Prisma:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPrisma();
