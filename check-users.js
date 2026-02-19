// @ts-check
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários no banco de dados...');
    
    const users = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        dataCriacao: true
      }
    });
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco de dados.');
      console.log('Execute: npx prisma db seed');
    } else {
      console.log(`✅ Encontrados ${users.length} usuários no banco:`);
      console.log('');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.nome}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Tipo: ${user.tipo}`);
        console.log(`   Ativo: ${user.ativo ? 'Sim' : 'Não'}`);
        console.log(`   Criado em: ${user.dataCriacao.toLocaleString('pt-BR')}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao consultar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
