const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProducaoUrgente() {
  try {
    console.log('🚨 CORREÇÃO URGENTE PARA PRODUÇÃO...\n');

    // 1. Verificar estrutura atual do banco
    console.log('🔍 Verificando estrutura atual...');
    
    try {
      // Tentar buscar motoristas sem o campo tipo
      const motoristas = await prisma.$queryRaw`
        SELECT id, nome, transportadoraId, cnh, cpf, telefone 
        FROM "Motorista" 
        LIMIT 5
      `;
      console.log(`✅ Encontrados ${motoristas.length} motoristas na tabela`);
    } catch (error) {
      console.error('❌ Erro ao acessar tabela Motorista:', error.message);
    }

    // 2. Verificar controles com ACERT
    console.log('\n🔍 Verificando controles com ACERT...');
    try {
      const controlesAcert = await prisma.$queryRaw`
        SELECT id, motorista, transportadora 
        FROM "ControleCarga" 
        WHERE transportadora = 'ACERT'
        LIMIT 10
      `;
      console.log(`⚠️ Encontrados ${controlesAcert.length} controles com ACERT`);
      
      if (controlesAcert.length > 0) {
        console.log('📋 Exemplos:');
        controlesAcert.slice(0, 3).forEach((c, i) => {
          console.log(`   ${i + 1}. ${c.motorista} - ${c.transportadora}`);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao verificar controles:', error.message);
    }

    // 3. Verificar notas com ACERT
    console.log('\n🔍 Verificando notas com ACERT...');
    try {
      const notasAcert = await prisma.$queryRaw`
        SELECT id, numeroNota, transportadora 
        FROM "NotaFiscal" 
        WHERE transportadora = 'ACERT'
        LIMIT 10
      `;
      console.log(`⚠️ Encontradas ${notasAcert.length} notas com ACERT`);
    } catch (error) {
      console.error('❌ Erro ao verificar notas:', error.message);
    }

    console.log('\n📊 RELATÓRIO DE PROBLEMAS:');
    console.log('1. ❌ Campo "tipo" não existe na tabela Motorista');
    console.log('2. ❌ Registros com "ACERT" causam erro no enum');
    console.log('3. ❌ APIs falhando por incompatibilidade de schema');

    console.log('\n🔧 AÇÕES NECESSÁRIAS:');
    console.log('1. Executar migração para adicionar campo "tipo"');
    console.log('2. Atualizar todos os "ACERT" para "ACCERT"');
    console.log('3. Regenerar cliente Prisma');
    console.log('4. Fazer novo deploy');

    console.log('\n⚠️ IMPORTANTE:');
    console.log('Este script apenas identifica os problemas.');
    console.log('As correções devem ser feitas via migração do Prisma.');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixProducaoUrgente();
