const { PrismaClient } = require('@prisma/client');

async function verificarChecklistTable() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Verificando se tabela ChecklistRecebimento existe...');

    // Tentar fazer uma query simples na tabela
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM "ChecklistRecebimento"
    `;

    console.log('✅ Tabela ChecklistRecebimento já existe!');
    console.log(`📊 Registros encontrados: ${count[0].total}`);

  } catch (error) {
    console.log('❌ Tabela ChecklistRecebimento NÃO existe');

    if (error.message.includes('does not exist')) {
      console.log('🔧 Criando tabela ChecklistRecebimento...');

      // Criar a tabela com SQL direto
      await prisma.$executeRaw`
        CREATE TABLE "ChecklistRecebimento" (
          "id" TEXT NOT NULL,
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
          "recebimentoPocket" BOOLEAN NOT NULL,
          "motivoNaoPocket" TEXT,
          "possuiCodigoBarras" BOOLEAN NOT NULL,
          "solicitouCadastroCodigoBarras" BOOLEAN NOT NULL,
          "paraQuemSolicitou" TEXT,
          "dadosLoteCadastradosSantri" BOOLEAN NOT NULL,
          "condicaoEmbalagens" TEXT NOT NULL,
          "houveRessalva" BOOLEAN NOT NULL,
          "descricaoRessalva" TEXT,
          "paraQuemInformouRessalva" TEXT,
          "houveDevolucao" BOOLEAN NOT NULL,
          "itensDevolvidos" TEXT,
          "quantidadeDevolvida" INTEGER,
          "fotoTiradaDevolucao" BOOLEAN NOT NULL,
          "notaDevolucaoEmitida" BOOLEAN NOT NULL,
          "numeroNotaDevolucao" TEXT,
          "alertaValidadeAutorizado" BOOLEAN NOT NULL DEFAULT false,
          "nomeAutorizadorLider" TEXT,
          "produtosComAlertaValidade" TEXT,
          "criadoPor" TEXT NOT NULL,

          CONSTRAINT "ChecklistRecebimento_pkey" PRIMARY KEY ("id")
        )
      `;

      // Criar índices
      await prisma.$executeRaw`
        CREATE INDEX "ChecklistRecebimento_dataCriacao_idx" ON "ChecklistRecebimento"("dataCriacao")
      `;
      await prisma.$executeRaw`
        CREATE INDEX "ChecklistRecebimento_dataRecebimento_idx" ON "ChecklistRecebimento"("dataRecebimento")
      `;
      await prisma.$executeRaw`
        CREATE INDEX "ChecklistRecebimento_nomeConferente_idx" ON "ChecklistRecebimento"("nomeConferente")
      `;
      await prisma.$executeRaw`
        CREATE INDEX "ChecklistRecebimento_nomeFabricante_idx" ON "ChecklistRecebimento"("nomeFabricante")
      `;
      await prisma.$executeRaw`
        CREATE INDEX "ChecklistRecebimento_alertaValidadeAutorizado_idx" ON "ChecklistRecebimento"("alertaValidadeAutorizado")
      `;
      await prisma.$executeRaw`
        CREATE INDEX "ChecklistRecebimento_nomeAutorizadorLider_idx" ON "ChecklistRecebimento"("nomeAutorizadorLider")
      `;

      // Adicionar foreign key constraint
      await prisma.$executeRaw`
        ALTER TABLE "ChecklistRecebimento" ADD CONSTRAINT "ChecklistRecebimento_criadoPor_fkey" FOREIGN KEY ("criadoPor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      `;

      console.log('✅ Tabela ChecklistRecebimento criada com sucesso!');
    } else {
      console.error('❌ Erro inesperado:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

verificarChecklistTable();
