// scripts/testar-exclusao-nota.js
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function testarExclusao() {
  console.log('=== TESTANDO EXCLUSÃO DE NOTA ===');
  
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL.replace('prisma+postgres://', 'postgresql://'),
  });

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');

    // Buscar uma nota disponível para testar
    const notaDisponivel = await prisma.notaFiscal.findFirst({
      where: {
        controleId: null
      },
      select: {
        id: true,
        numeroNota: true,
        codigo: true
      }
    });

    if (!notaDisponivel) {
      console.log('❌ Nenhuma nota disponível para teste');
      return;
    }

    console.log(`📝 Nota encontrada para teste:`);
    console.log(`   ID: ${notaDisponivel.id}`);
    console.log(`   Nota: ${notaDisponivel.numeroNota}`);
    console.log(`   Código: ${notaDisponivel.codigo}`);
    console.log(`   Status: Disponível para exclusão`);

    console.log('\n🔍 INSTRUÇÕES PARA TESTE MANUAL:');
    console.log('1. Faça login como usuário ADMIN ou GERENTE');
    console.log('2. Acesse a página "Consultar Notas"');
    console.log('3. Procure pela nota acima no filtro');
    console.log('4. O botão de lixeira deve estar visível e clicável');
    console.log('5. Clique no botão e confirme a exclusão');

    console.log('\n📋 SE O BOTÃO NÃO APARECER:');
    console.log('- Verifique se você está logado como ADMIN/GERENTE');
    console.log('- Limpe o cache do navegador (F5 ou Ctrl+F5)');
    console.log('- Verifique no console do navegador por erros');

  } catch (error) {
    console.error('❌ Erro ao testar exclusão:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testarExclusao();
