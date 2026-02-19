// scripts/verificar-notas-admin.js
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function verificarNotasAdmin() {
  console.log('=== VERIFICANDO NOTAS PARA USUÁRIO ADMIN ===');
  
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL.replace('prisma+postgres://', 'postgresql://'),
  });

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');

    // Verificar notas não vinculadas (devem aparecer com botão ativo)
    console.log('\n🔍 NOTAS NÃO VINCULADAS (botão deve estar ATIVO):');
    const notasNaoVinculadas = await prisma.notaFiscal.findMany({
      where: {
        controleId: null
      },
      select: {
        id: true,
        numeroNota: true,
        codigo: true,
        dataCriacao: true,
        volumes: true
      },
      orderBy: {
        dataCriacao: 'desc'
      },
      take: 5
    });
    
    console.log(`Encontradas ${notasNaoVinculadas.length} notas não vinculadas:`);
    notasNaoVinculadas.forEach((nota, i) => {
      console.log(`  ${i+1}. Nota: ${nota.numeroNota} | Código: ${nota.codigo.substring(0, 20)}... | Volumes: ${nota.volumes || 1}`);
      console.log(`     ID: ${nota.id}`);
      console.log(`     ControleId: ${nota.controleId || 'NULL (BOTÃO ATIVO)'}`);
      console.log('');
    });

    // Verificar notas vinculadas (botão deve estar desabilitado)
    console.log('\n🔍 NOTAS VINCULADAS (botão deve estar DESABILITADO):');
    const notasVinculadas = await prisma.notaFiscal.findMany({
      where: {
        controleId: {
          not: null
        }
      },
      select: {
        id: true,
        numeroNota: true,
        codigo: true,
        controleId: true
      },
      orderBy: {
        dataCriacao: 'desc'
      },
      take: 3
    });
    
    console.log(`Encontradas ${notasVinculadas.length} notas vinculadas:`);
    notasVinculadas.forEach((nota, i) => {
      console.log(`  ${i+1}. Nota: ${nota.numeroNota} | Código: ${nota.codigo.substring(0, 20)}...`);
      console.log(`     ID: ${nota.id}`);
      console.log(`     ControleId: ${nota.controleId} (BOTÃO DESABILITADO)`);
      console.log('');
    });

    // Verificar usuário admin
    console.log('\n🔍 VERIFICANDO USUÁRIO ADMIN:');
    const adminUser = await prisma.usuario.findFirst({
      where: {
        tipo: 'ADMIN',
        ativo: true
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true
      }
    });
    
    if (adminUser) {
      console.log(`✅ Usuário ADMIN encontrado:`);
      console.log(`   Nome: ${adminUser.nome}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Tipo: ${adminUser.tipo}`);
      console.log(`   Ativo: ${adminUser.ativo}`);
      console.log(`   Permissão para excluir: ✅ SIM`);
    } else {
      console.log(`❌ Nenhum usuário ADMIN ativo encontrado`);
    }

    console.log('\n📋 INSTRUÇÕES DEBUG:');
    console.log('1. Abra a página "Consultar Notas"');
    console.log('2. Abra o console do navegador (F12)');
    console.log('3. Procure pelas notas acima na lista');
    console.log('4. Para notas não vinculadas, o botão deve ser visível e clicável');
    console.log('5. Clique com botão direito no botão e "Inspecionar Elemento"');
    console.log('6. Verifique se há CSS escondendo o botão');

    console.log('\n🔍 VERIFICAÇÃO DE CONSOLE:');
    console.log('No console do navegador, digite:');
    console.log('document.querySelectorAll("button[aria-label*="Delete"]")');
    console.log('Isso deve mostrar todos os botões de delete na página');

  } catch (error) {
    console.error('❌ Erro ao verificar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarNotasAdmin();
