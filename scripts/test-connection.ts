import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Successfully connected to the database');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1+1 as result`;
    console.log('✅ Simple query result:', result);
    
    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('\n📋 Database tables:');
    console.log(tables);
    
    // Check controle_carga table structure
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ControleCarga'
        ORDER BY ordinal_position
      `;
      console.log('\n📋 ControleCarga columns:');
      console.log(columns);
    } catch (e) {
      console.error('❌ Error checking table structure:', e);
    }
    
  } catch (error) {
    console.error('❌ Database connection error:');
    console.error(error);
    
    // Show environment variables (without sensitive data)
    console.log('\nEnvironment variables:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***CONFIGURED***' : 'NOT CONFIGURED');
    
  } finally {
    await prisma.$disconnect();
  }
}

testConnection()
  .catch(console.error)
  .finally(() => process.exit(0));
