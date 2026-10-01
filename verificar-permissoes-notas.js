// scripts/verificar-permissoes-notas.js
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function verificarPermissoes() {
  console.log('=== VERIFICANDO PERMISSÕES PARA EXCLUIR NOTAS ===');
  
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL.replace('prisma+postgres://', 'postgresql://'),
  });

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');

    // 1. Verificar notas disponíveis (não vinculadas)
    console.log('\n🔍 VERIFICANDO NOTAS DISPONÍVEIS PARA EXCLUSÃO:');
    const notasDisponiveis = await prisma.notaFiscal.findMany({
      where: {
        controleId: null
      },
      select: {
        id: true,
        numeroNota: true,
        codigo: true,
        dataCriacao: true
      },
      orderBy: {
        dataCriacao: 'desc'
      },
      take: 10
    });
    
    console.log(`Encontradas ${notasDisponiveis.length} notas disponíveis para exclusão:`);
    notasDisponiveis.forEach((nota, i) => {
      console.log(`  ${i+1}. ID: ${nota.id.substring(0, 8)}... - Nota: ${nota.numeroNota} - Código: ${nota.codigo}`);
    });

    // 2. Verificar usuários e suas permissões
    console.log('\n🔍 VERIFICANDO USUÁRIOS E PERMISSÕES:');
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true
      },
      orderBy: {
        nome: 'asc'
      }
    });
    
    console.log(`Encontrados ${usuarios.length} usuários:`);
    usuarios.forEach((usuario, i) => {
      const podeExcluir = (usuario.tipo === 'ADMIN' || usuario.tipo === 'GERENTE') && usuario.ativo;
      console.log(`  ${i+1}. ${usuario.nome} (${usuario.email}) - Tipo: ${usuario.tipo} - Ativo: ${usuario.ativo} - Pode excluir: ${podeExcluir ? '✅' : '❌'}`);
    });

    // 3. Verificar se há notas vinculadas
    console.log('\n🔍 VERIFICANDO NOTAS VINCULADAS:');
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
      take: 5
    });
    
    console.log(`Encontradas ${notasVinculadas.length} notas vinculadas (não podem ser excluídas):`);
    notasVinculadas.forEach((nota, i) => {
      console.log(`  ${i+1}. ID: ${nota.id.substring(0, 8)}... - Nota: ${nota.numeroNota} - ControleID: ${nota.controleId.substring(0, 8)}...`);
    });

    console.log('\n📋 RESUMO:');
    console.log(`- Notas disponíveis para exclusão: ${notasDisponiveis.length}`);
    console.log(`- Notas vinculadas (não podem ser excluídas): ${notasVinculadas.length}`);
    console.log(`- Usuários com permissão para excluir: ${usuarios.filter(u => (u.tipo === 'ADMIN' || u.tipo === 'GERENTE') && u.ativo).length}`);

    if (notasDisponiveis.length === 0) {
      console.log('\n⚠️ ATENÇÃO: Não há notas disponíveis para exclusão!');
      console.log('Todas as notas estão vinculadas a controles de carga.');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar permissões:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarPermissoes();
