// Script para resolver o problema da tabela PalletAjuste
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixPalletAjuste() {
  try {
    console.log('🔍 Verificando status da tabela PalletAjuste...');
    
    // Tentar acessar a tabela usando o modelo Prisma
    try {
      const count = await prisma.palletAjuste.count();
      console.log('✅ Tabela PalletAjuste existe e está funcionando!');
      console.log('📊 Total de registros:', count);
      
      // Testar inserção se não houver registros
      if (count === 0) {
        console.log('🧪 Testando inserção de registro...');
        
        // Buscar um usuário admin para o teste
        const admin = await prisma.usuario.findFirst({
          where: { tipo: 'ADMIN' }
        });
        
        if (admin) {
          const testAjuste = await prisma.palletAjuste.create({
            data: {
              motorista: 'Teste Sistema',
              transportadora: 'ACCERT',
              quantidade: 1,
              observacao: 'Registro de teste - sistema funcionando',
              usuarioId: admin.id
            }
          });
          
          console.log('✅ Registro de teste criado:', testAjuste.id);
          console.log('🎉 Sistema de ajustes de pallets está funcionando perfeitamente!');
        } else {
          console.log('⚠️ Nenhum usuário ADMIN encontrado para teste');
        }
      }
      
      return true;
      
    } catch (error) {
      if (error.code === 'P2021' || error.message.includes('does not exist')) {
        console.log('❌ Tabela PalletAjuste não existe no banco de dados');
        console.log('');
        console.log('🔧 SOLUÇÕES POSSÍVEIS:');
        console.log('');
        console.log('1. OPÇÃO RECOMENDADA - Execute no console do Neon (neon.tech):');
        console.log('');
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
        console.log('CREATE INDEX "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");');
        console.log('CREATE INDEX "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");');
        console.log('CREATE INDEX "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");');
        console.log('');
        console.log('2. ALTERNATIVA - Execute: npx prisma db push --force-reset');
        console.log('   ⚠️ ATENÇÃO: Isso irá APAGAR todos os dados do banco!');
        console.log('');
        console.log('3. ALTERNATIVA - Configure DIRECT_URL no .env com URL direta do PostgreSQL');
        console.log('   e execute: npx prisma migrate dev');
        
        return false;
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

fixPalletAjuste().then(success => {
  if (success) {
    console.log('');
    console.log('🎉 PROBLEMA RESOLVIDO! A funcionalidade de ajustes de pallets está disponível.');
  } else {
    console.log('');
    console.log('⚠️ A tabela precisa ser criada manualmente. Siga as instruções acima.');
  }
});
