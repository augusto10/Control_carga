const { PrismaClient } = require('@prisma/client');

async function criarChecklistTable() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Criando tabela ChecklistRecebimento...');

    // Verificar se já existe
    try {
      await prisma.$queryRaw`SELECT 1 FROM "ChecklistRecebimento" LIMIT 1`;
      console.log('✅ Tabela já existe!');
      return;
    } catch (error) {
      // Tabela não existe, vamos criar
    }

    // Criar tabela com SQL completo
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ChecklistRecebimento" (
        "id" TEXT PRIMARY KEY,
        "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "dataRecebimento" TIMESTAMP(3) NOT NULL,
        "horarioRecebimento" TEXT NOT NULL,
        "nomeConferente" TEXT NOT NULL,
        "nomeFabricante" TEXT NOT NULL,
        "descricaoProduto" TEXT NOT NULL,
        "numeroLote" TEXT NOT NULL,
        "dataFabricacao" TIMESTAMP(3) NOT NULL,
        "dataVencimento" TIMESTAMP(3) NOT NULL,
        "fotoRecebimento" TEXT,
        "fotoDevolucao" TEXT,
        "admProduto" TEXT,
        "codigoBarrasCaixaMaster" TEXT,
        "codigoBarrasCaixaInterna" TEXT,
        "codigoBarrasItem" TEXT,
        "recebimentoPocket" BOOLEAN NOT NULL DEFAULT false,
        "motivoNaoPocket" TEXT,
        "possuiCodigoBarras" BOOLEAN NOT NULL DEFAULT false,
        "solicitouCadastroCodigoBarras" BOOLEAN NOT NULL DEFAULT false,
        "paraQuemSolicitou" TEXT,
        "dadosLoteCadastradosSantri" BOOLEAN NOT NULL DEFAULT false,
        "condicaoEmbalagens" TEXT NOT NULL DEFAULT 'OTIMA',
        "houveRessalva" BOOLEAN NOT NULL DEFAULT false,
        "descricaoRessalva" TEXT,
        "paraQuemInformouRessalva" TEXT,
        "houveDevolucao" BOOLEAN NOT NULL DEFAULT false,
        "itensDevolvidos" TEXT,
        "quantidadeDevolvida" INTEGER,
        "fotoTiradaDevolucao" BOOLEAN NOT NULL DEFAULT false,
        "notaDevolucaoEmitida" BOOLEAN NOT NULL DEFAULT false,
        "numeroNotaDevolucao" TEXT,
        "alertaValidadeAutorizado" BOOLEAN NOT NULL DEFAULT false,
        "nomeAutorizadorLider" TEXT,
        "produtosComAlertaValidade" TEXT,
        "criadoPor" TEXT NOT NULL
      )
    `;

    // Criar índices
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ChecklistRecebimento_dataCriacao_idx" ON "ChecklistRecebimento"("dataCriacao")
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ChecklistRecebimento_dataRecebimento_idx" ON "ChecklistRecebimento"("dataRecebimento")
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ChecklistRecebimento_nomeConferente_idx" ON "ChecklistRecebimento"("nomeConferente")
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "ChecklistRecebimento_nomeFabricante_idx" ON "ChecklistRecebimento"("nomeFabricante")
    `;

    console.log('✅ Tabela ChecklistRecebimento criada com sucesso!');

    // Verificar criação
    const count = await prisma.$queryRaw`SELECT COUNT(*) as total FROM "ChecklistRecebimento"`;
    console.log(`📊 Registros na tabela: ${count[0].total}`);

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  } finally {
    await prisma.$disconnect();
  }
}

criarChecklistTable();
