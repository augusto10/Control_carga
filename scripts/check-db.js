
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

async function run() {
  console.log('DATABASE_URL is set:', !!process.env.DATABASE_URL);
  
  const prisma = new PrismaClient();
  try {
    const lastNota = await prisma.notaFiscal.findFirst({ orderBy: { dataCriacao: 'desc' } });
    const lastControle = await prisma.controleCarga.findFirst({ orderBy: { dataCriacao: 'desc' } });
    const lastPedido = await prisma.pedido.findFirst({ orderBy: { dataCriacao: 'desc' } });

    console.log('--- Last Record Dates ---');
    console.log('Last Nota Fiscal:', lastNota ? lastNota.dataCriacao : 'No data');
    console.log('Last Controle Carga:', lastControle ? lastControle.dataCriacao : 'No data');
    console.log('Last Pedido:', lastPedido ? lastPedido.dataCriacao : 'No data');
    console.log('Current Date:', new Date());
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
