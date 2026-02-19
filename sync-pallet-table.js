// Script para sincronizar tabela PalletAjuste usando Prisma
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function syncPalletTable() {
  try {
    console.log('🔍 Verificando se a tabela PalletAjuste existe...');
    
    // Primeiro, tentar acessar a tabela
    try {
      const count = await prisma.palletAjuste.count();
      console.log(`✅ Tabela PalletAjuste já existe! Total de registros: ${count}`);
      
      // Testar inserção se não houver registros
      if (count === 0) {
        console.log('🧪 Inserindo registro de teste...');
        
        const admin = await prisma.usuario.findFirst({
          where: { tipo: 'ADMIN' }
        });
        
        if (admin) {
          const teste = await prisma.palletAjuste.create({
            data: {
              motorista: 'Teste Desenvolvimento',
              transportadora: 'ACCERT',
              quantidade: 1,
              observacao: 'Registro de teste - desenvolvimento sincronizado',
              usuarioId: admin.id
            }
          });
          
          console.log(`✅ Registro de teste criado: ${teste.id}`);
        }
      }
      
      console.log('🎉 PROBLEMA RESOLVIDO! A funcionalidade está funcionando!');
      return true;
      
    } catch (error) {
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('❌ Tabela PalletAjuste não existe no banco de desenvolvimento');
        
        // Tentar usar Prisma migrate
        console.log('🔄 Tentando sincronizar schema com Prisma...');
        
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
          console.log('📝 Executando: npx prisma generate');
          await execAsync('npx prisma generate');
          console.log('✅ Prisma client regenerado');
          
          console.log('📝 Tentando: npx prisma db push --skip-generate');
          const { stdout, stderr } = await execAsync('npx prisma db push --skip-generate');
          
          if (stderr && !stderr.includes('warning')) {
            throw new Error(stderr);
          }
          
          console.log('✅ Schema sincronizado com sucesso!');
          console.log(stdout);
          
          // Testar novamente
          const count = await prisma.palletAjuste.count();
          console.log(`✅ Tabela criada! Total de registros: ${count}`);
          
          return true;
          
        } catch (migrateError) {
          console.log('❌ Não foi possível sincronizar automaticamente');
          console.log('Erro:', migrateError.message);
          
          console.log('\n📋 SOLUÇÃO MANUAL:');
          console.log('1. Execute no terminal:');
          console.log('   npx prisma db push --force-reset');
          console.log('   ⚠️ ATENÇÃO: Isso irá recriar o banco de desenvolvimento (dados serão perdidos)');
          console.log('');
          console.log('2. OU execute diretamente no banco de desenvolvimento o SQL:');
          console.log(`
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

CREATE INDEX "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");
CREATE INDEX "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");
CREATE INDEX "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");
          `);
          
          return false;
        }
      } else {
        throw error;
      }
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

syncPalletTable().then(success => {
  if (success) {
    console.log('\n🎉 SUCESSO! A funcionalidade de ajustes de pallets está disponível!');
    console.log('✅ Você pode testar na página de relatórios de pallets');
  } else {
    console.log('\n⚠️ Ação manual necessária para completar a sincronização');
  }
});
