import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

// Carregar .env do diretório raiz
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkData() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL not found in process.env, trying to read .env manually');
    const fs = require('fs');
    const envFile = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
    const match = envFile.match(/DATABASE_URL="(.+)"/);
    if (match) {
      process.env.DATABASE_URL = match[1];
    }
  }

  const prisma = new PrismaClient();
  try {
    const lastNotas = await prisma.notaFiscal.findMany({
      orderBy: { dataCriacao: 'desc' },
      take: 5
    });
    console.log('Last 5 Notas Fiscal:', lastNotas.map(n => ({ id: n.id, dataCriacao: n.dataCriacao })));

    const lastControles = await prisma.controleCarga.findMany({
      orderBy: { dataCriacao: 'desc' },
      take: 5
    });
    console.log('Last 5 Controles Carga:', lastControles.map(c => ({ id: c.id, dataCriacao: c.dataCriacao })));

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
