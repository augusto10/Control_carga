const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Verificando dados no banco...\n');

    // Verificar controles
    const controles = await prisma.controleCarga.findMany({
      take: 5,
      select: {
        id: true,
        motorista: true,
        transportadora: true,
        qtdPalletsLevados: true,
        qtdPalletsDevolvidos: true,
        dataCriacao: true,
        finalizado: true
      }
    });

    console.log(`📋 Controles encontrados: ${controles.length}`);
    if (controles.length > 0) {
      controles.forEach((c, i) => {
        console.log(`${i + 1}. ${c.motorista} - ${c.transportadora} - Levados: ${c.qtdPalletsLevados}, Devolvidos: ${c.qtdPalletsDevolvidos}`);
      });
    } else {
      console.log('❌ Nenhum controle encontrado');
      console.log('💡 Você precisa criar alguns controles primeiro');
    }

    console.log('');

    // Verificar usuários
    const usuarios = await prisma.usuario.findMany({
      take: 3,
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true
      }
    });

    console.log(`👥 Usuários encontrados: ${usuarios.length}`);
    if (usuarios.length > 0) {
      usuarios.forEach((u, i) => {
        console.log(`${i + 1}. ${u.nome} (${u.email}) - ${u.tipo} - ${u.ativo ? 'Ativo' : 'Inativo'}`);
      });
    } else {
      console.log('❌ Nenhum usuário encontrado');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
