import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    const user = await prisma.$queryRaw`
      SELECT id, nome, email, tipo, ativo, "dataCriacao" 
      FROM "Usuario" 
      WHERE email = 'admin@controlecarga.com';
    `;
    
    console.log('Resultado da consulta:');
    console.log(JSON.stringify(user, null, 2));
    
  } catch (error) {
    console.error('Erro ao verificar usuário admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();
