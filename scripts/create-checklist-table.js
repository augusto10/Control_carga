// Script para criar tabela ChecklistRecebimento de forma segura
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando estado atual do banco...');
    
    // 1. Verificar se a tabela já existe
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'ChecklistRecebimento'`;
    
    const tableExists = tables && tables.length > 0;
    console.log(`- Tabela ChecklistRecebimento: ${tableExists ? 'existe' : 'não existe'}`);
    
    // 2. Verificar se o enum existe
    const enums = await prisma.$queryRaw`
      SELECT typname
      FROM pg_type 
      WHERE typname = 'condicaoembalagem'`;
    
    const enumExists = enums && enums.length > 0;
    console.log(`- Enum CondicaoEmbalagem: ${enumExists ? 'existe' : 'não existe'}`);
    
    if (!enumExists) {
      console.log('\n📦 Criando enum CondicaoEmbalagem...');
      await prisma.$executeRaw`CREATE TYPE "CondicaoEmbalagem" AS ENUM ('OTIMA', 'BOA', 'RUIM')`;
    }
    
    if (!tableExists) {
      console.log('\n📦 Criando tabela ChecklistRecebimento...');
      await prisma.$executeRaw`
        CREATE TABLE "ChecklistRecebimento" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "dataCriacao" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          -- Dados básicos do recebimento
          "dataRecebimento" TIMESTAMPTZ NOT NULL,
          "horarioRecebimento" TEXT NOT NULL,
          "nomeConferente" TEXT NOT NULL,
          "nomeFabricante" TEXT NOT NULL,
          "descricaoProduto" TEXT NOT NULL,
          "numeroLote" TEXT NOT NULL,
          "dataFabricacao" TIMESTAMPTZ NOT NULL,
          "dataVencimento" TIMESTAMPTZ NOT NULL,
          
          -- Fotos
          "fotoRecebimento" TEXT,
          "fotoDevolucao" TEXT,
          
          -- Códigos de barras
          "admProduto" TEXT,
          "codigoBarrasCaixaMaster" TEXT,
          "codigoBarrasCaixaInterna" TEXT,
          "codigoBarrasItem" TEXT,
          
          -- Perguntas do checklist
          "recebimentoPocket" BOOLEAN NOT NULL,
          "motivoNaoPocket" TEXT,
          "possuiCodigoBarras" BOOLEAN NOT NULL,
          "solicitouCadastroCodigoBarras" BOOLEAN NOT NULL,
          "paraQuemSolicitou" TEXT,
          "dadosLoteCadastradosSantri" BOOLEAN NOT NULL,
          "condicaoEmbalagens" "CondicaoEmbalagem" NOT NULL,
          "houveRessalva" BOOLEAN NOT NULL,
          "descricaoRessalva" TEXT,
          "paraQuemInformouRessalva" TEXT,
          "houveDevolucao" BOOLEAN NOT NULL,
          "itensDevolvidos" TEXT,
          "quantidadeDevolvida" INTEGER,
          "fotoTiradaDevolucao" BOOLEAN NOT NULL,
          "notaDevolucaoEmitida" BOOLEAN NOT NULL,
          "numeroNotaDevolucao" TEXT,
          
          -- Alertas de validade
          "alertaValidadeAutorizado" BOOLEAN NOT NULL DEFAULT false,
          "nomeAutorizadorLider" TEXT,
          "produtosComAlertaValidade" TEXT,
          
          -- Auditoria
          "criadoPor" UUID NOT NULL,
          CONSTRAINT "ChecklistRecebimento_criadoPor_fkey" FOREIGN KEY ("criadoPor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )`;

      // Criar índices
      console.log('\n📦 Criando índices...');
      const indices = [
        `CREATE INDEX "checklist_recebimento_data_criacao_idx" ON "ChecklistRecebimento"("dataCriacao")`,
        `CREATE INDEX "checklist_recebimento_data_recebimento_idx" ON "ChecklistRecebimento"("dataRecebimento")`,
        `CREATE INDEX "checklist_recebimento_nome_conferente_idx" ON "ChecklistRecebimento"("nomeConferente")`,
        `CREATE INDEX "checklist_recebimento_nome_fabricante_idx" ON "ChecklistRecebimento"("nomeFabricante")`,
        `CREATE INDEX "checklist_recebimento_alerta_validade_idx" ON "ChecklistRecebimento"("alertaValidadeAutorizado")`
      ];

      for (const indexSql of indices) {
        await prisma.$executeRaw`${indexSql}`;
      }
      
      console.log('✅ Estruturas criadas com sucesso!');
      
      // Verificar novamente
      const tablesAfter = await prisma.$queryRaw`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename = 'ChecklistRecebimento'`;
      
      const enumsAfter = await prisma.$queryRaw`
        SELECT typname
        FROM pg_type 
        WHERE typname = 'condicaoembalagem'`;
      
      console.log('\n🔍 Verificação após criação:');
      console.log(`- Tabela ChecklistRecebimento: ${tablesAfter.length > 0 ? 'OK' : 'ERRO'}`);
      console.log(`- Enum CondicaoEmbalagem: ${enumsAfter.length > 0 ? 'OK' : 'ERRO'}`);
      
      // 3. Atualizar o Prisma para reconhecer as novas estruturas
      console.log('\n🔄 Atualizando cliente Prisma...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      console.log('\n✅ Processo concluído com sucesso!');
      console.log('Agora você pode usar ChecklistRecebimento normalmente via Prisma.');
      
    } else {
      console.log('\n✅ Todas as estruturas necessárias já existem!');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o processo:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();