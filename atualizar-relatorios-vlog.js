// scripts/atualizar-relatorios-vlog.js
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function atualizarRelatorios() {
  console.log('=== ATUALIZANDO RELATÓRIOS PARA EXIBIR VLOG CORRETAMENTE ===');
  
  // Configuração do Prisma
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL.replace('prisma+postgres://', 'postgresql://'),
  });

  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');

    // 1. Atualizar ControleCarga onde motorista tem VLOG no nome
    console.log('\n🔧 ATUALIZANDO CONTROLES DE CARGA...');
    const resultado = await prisma.$executeRaw`
      UPDATE "ControleCarga" 
      SET transportadora = 'VLOG'
      WHERE motorista ILIKE '%vlog%'
      AND transportadora = 'TERCEIRIZADA';
    `;
    
    console.log(`✅ ${resultado} controles atualizados para VLOG`);

    // 2. Atualizar PalletAjuste onde motorista tem VLOG no nome
    console.log('\n🔧 ATUALIZANDO AJUSTES DE PALLET...');
    const resultadoPallets = await prisma.$executeRaw`
      UPDATE "PalletAjuste" 
      SET transportadora = 'VLOG'
      WHERE motorista ILIKE '%vlog%'
      AND transportadora = 'TERCEIRIZADA';
    `;
    
    console.log(`✅ ${resultadoPallets} ajustes de pallet atualizados para VLOG`);

    // 3. Verificar se ainda existem inconsistências
    console.log('\n🔍 VERIFICANDO INCONSISTÊNCIAS RESTANTES...');
    const inconsistencias = await prisma.$queryRaw`
      SELECT 'ControleCarga' as tabela, id, motorista, transportadora::text
      FROM "ControleCarga"
      WHERE motorista ILIKE '%vlog%' 
      AND transportadora = 'TERCEIRIZADA'
      
      UNION ALL
      
      SELECT 'PalletAjuste' as tabela, id, motorista, transportadora::text
      FROM "PalletAjuste"
      WHERE motorista ILIKE '%vlog%' 
      AND transportadora = 'TERCEIRIZADA';
    `;

    if (inconsistencias.length > 0) {
      console.log('\n⚠️ Ainda existem registros com problema:');
      console.table(inconsistencias);
    } else {
      console.log('✅ Nenhuma inconsistência encontrada!');
    }

    console.log('\n✅ Atualização concluída! Os relatórios agora devem exibir VLOG corretamente.');

  } catch (error) {
    console.error('❌ Erro ao atualizar relatórios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

atualizarRelatorios();
