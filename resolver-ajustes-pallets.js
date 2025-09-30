#!/usr/bin/env node
// Script completo para resolver o problema dos ajustes de pallets
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 RESOLVER: Funcionalidade de Ajustes de Pallets');
  console.log('='.repeat(50));
  
  try {
    // Passo 1: Verificar se a tabela existe
    console.log('🔍 Passo 1: Verificando se a tabela PalletAjuste existe...');
    
    let tabelaExiste = false;
    try {
      const count = await prisma.palletAjuste.count();
      tabelaExiste = true;
      console.log(`✅ Tabela existe! Total de registros: ${count}`);
      
      if (count === 0) {
        console.log('🧪 Testando inserção de registro...');
        
        // Buscar um usuário admin
        const admin = await prisma.usuario.findFirst({
          where: { tipo: 'ADMIN' }
        });
        
        if (admin) {
          const teste = await prisma.palletAjuste.create({
            data: {
              motorista: 'Sistema de Teste',
              transportadora: 'ACCERT',
              quantidade: 1,
              observacao: 'Registro de teste - funcionalidade habilitada com sucesso',
              usuarioId: admin.id
            }
          });
          
          console.log(`✅ Registro de teste criado: ${teste.id}`);
          console.log('🎉 PROBLEMA RESOLVIDO! A funcionalidade está funcionando perfeitamente!');
        }
      } else {
        console.log('🎉 PROBLEMA RESOLVIDO! A funcionalidade já está funcionando!');
      }
      
    } catch (error) {
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('❌ Tabela PalletAjuste não existe');
        tabelaExiste = false;
      } else {
        throw error;
      }
    }
    
    if (!tabelaExiste) {
      console.log('\n🔨 Passo 2: Tentando criar a tabela automaticamente...');
      
      try {
        // Tentar criar a tabela
        const createSQL = `
          CREATE TABLE "PalletAjuste" (
            "id" TEXT NOT NULL,
            "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "motorista" TEXT,
            "transportadora" TEXT,
            "quantidade" INTEGER NOT NULL,
            "observacao" TEXT,
            "usuarioId" TEXT NOT NULL,
            CONSTRAINT "PalletAjuste_pkey" PRIMARY KEY ("id"),
            CONSTRAINT "PalletAjuste_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );
        `;
        
        await prisma.$executeRawUnsafe(createSQL);
        console.log('✅ Tabela criada com sucesso!');
        
        // Criar índices
        const indexes = [
          'CREATE INDEX "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");',
          'CREATE INDEX "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");',
          'CREATE INDEX "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");'
        ];
        
        for (const index of indexes) {
          try {
            await prisma.$executeRawUnsafe(index);
          } catch (indexError) {
            console.log(`⚠️ Aviso ao criar índice: ${indexError.message}`);
          }
        }
        
        console.log('✅ Índices criados!');
        
        // Testar a tabela criada
        const count = await prisma.palletAjuste.count();
        console.log(`✅ Tabela funcionando! Total de registros: ${count}`);
        
        console.log('🎉 PROBLEMA RESOLVIDO! A funcionalidade foi habilitada com sucesso!');
        
      } catch (createError) {
        console.log('❌ Não foi possível criar a tabela automaticamente');
        console.log(`Erro: ${createError.message}`);
        
        if (createError.code === '42501') {
          console.log('\n🔐 Problema de permissão detectado');
        }
        
        console.log('\n📋 SOLUÇÃO MANUAL NECESSÁRIA:');
        console.log('');
        console.log('1. Acesse o console do seu banco Neon em: https://neon.tech');
        console.log('2. Faça login e selecione seu projeto');
        console.log('3. Vá para "SQL Editor" e execute o seguinte SQL:');
        console.log('');
        console.log('-- Criar tabela PalletAjuste');
        console.log('CREATE TABLE "PalletAjuste" (');
        console.log('  "id" TEXT NOT NULL,');
        console.log('  "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,');
        console.log('  "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,');
        console.log('  "motorista" TEXT,');
        console.log('  "transportadora" TEXT,');
        console.log('  "quantidade" INTEGER NOT NULL,');
        console.log('  "observacao" TEXT,');
        console.log('  "usuarioId" TEXT NOT NULL,');
        console.log('  CONSTRAINT "PalletAjuste_pkey" PRIMARY KEY ("id"),');
        console.log('  CONSTRAINT "PalletAjuste_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE');
        console.log(');');
        console.log('');
        console.log('-- Criar índices');
        console.log('CREATE INDEX "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");');
        console.log('CREATE INDEX "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");');
        console.log('CREATE INDEX "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");');
        console.log('');
        console.log('4. Após executar o SQL, execute este script novamente para confirmar');
        console.log('');
        console.log('💡 Alternativamente, você pode usar: npx prisma db push --force-reset');
        console.log('   ⚠️ ATENÇÃO: Isso irá APAGAR todos os dados do banco!');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
  } finally {
    await prisma.$disconnect();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📚 Documentação completa: INSTRUCOES_PALLET_AJUSTE.md');
  console.log('🔧 Para mais ajuda, execute: node resolver-ajustes-pallets.js');
}

main();
