
const path = require('path');
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading env from:', envPath);
const result = require('dotenv').config({ path: envPath });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env loaded successfully');
}
console.log('DATABASE_URL is set:', !!process.env.DATABASE_URL);

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function checkDates() {
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
  } catch (error) {
    console.error('Error checking dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDates();
