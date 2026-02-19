// Check database tables
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkTables() {
  try {
    // This will show what tables Prisma knows about
    const result = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log('Tables in database:');
    result.forEach(row => {
      console.log('- ' + row.tablename);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
