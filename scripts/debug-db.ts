import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugDatabase() {
  try {
    console.log('=== Debug Database ===');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Count records
    const count = await prisma.controleCarga.count();
    console.log(`\n📊 Total controls: ${count}`);
    
    if (count === 0) {
      console.log('No controls found in the database');
      return;
    }
    
    // Show first 5 controls
    console.log('\n📝 First 5 controls:');
    const controls = await prisma.controleCarga.findMany({
      take: 5,
      orderBy: { dataCriacao: 'desc' },
      include: {
        notas: {
          select: { id: true, codigo: true }
        }
      }
    });
    
    console.log(JSON.stringify(controls, (key, value) => 
      key === 'senha' ? '***' : value, 2));
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugDatabase()
  .catch(console.error)
  .finally(() => process.exit(0));
