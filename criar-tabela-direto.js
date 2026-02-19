const { Pool } = require('pg');
require('dotenv').config();

async function criarTabelaDireto() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔧 Criando tabela ChecklistRecebimento diretamente no PostgreSQL...');

    // Verificar se já existe
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'ChecklistRecebimento'
      );
    `);

    if (checkResult.rows[0].exists) {
      console.log('✅ Tabela já existe!');
      return;
    }

    console.log('📝 Criando tabela...');

    // Criar tabela
    await pool.query(`
      CREATE TABLE "ChecklistRecebimento" (
        "id" TEXT PRIMARY KEY,
        "dataCriacao" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "dataRecebimento" TIMESTAMP WITH TIME ZONE NOT NULL,
        "horarioRecebimento" TEXT NOT NULL,
        "nomeConferente" TEXT NOT NULL,
        "nomeFabricante" TEXT NOT NULL,
        "descricaoProduto" TEXT NOT NULL,
        "numeroLote" TEXT NOT NULL,
        "dataFabricacao" TIMESTAMP WITH TIME ZONE NOT NULL,
        "dataVencimento" TIMESTAMP WITH TIME ZONE NOT NULL,
        "fotoRecebimento" TEXT,
        "fotoDevolucao" TEXT,
        "admProduto" TEXT,
        "codigoBarrasCaixaMaster" TEXT,
        "codigoBarrasCaixaInterna" TEXT,
        "codigoBarrasItem" TEXT,
        "recebimentoPocket" BOOLEAN DEFAULT false,
        "motivoNaoPocket" TEXT,
        "possuiCodigoBarras" BOOLEAN DEFAULT false,
        "solicitouCadastroCodigoBarras" BOOLEAN DEFAULT false,
        "paraQuemSolicitou" TEXT,
        "dadosLoteCadastradosSantri" BOOLEAN DEFAULT false,
        "condicaoEmbalagens" TEXT DEFAULT 'OTIMA',
        "houveRessalva" BOOLEAN DEFAULT false,
        "descricaoRessalva" TEXT,
        "paraQuemInformouRessalva" TEXT,
        "houveDevolucao" BOOLEAN DEFAULT false,
        "itensDevolvidos" TEXT,
        "quantidadeDevolvida" INTEGER,
        "fotoTiradaDevolucao" BOOLEAN DEFAULT false,
        "notaDevolucaoEmitida" BOOLEAN DEFAULT false,
        "numeroNotaDevolucao" TEXT,
        "alertaValidadeAutorizado" BOOLEAN DEFAULT false,
        "nomeAutorizadorLider" TEXT,
        "produtosComAlertaValidade" TEXT,
        "criadoPor" TEXT NOT NULL
      );
    `);

    // Criar índices
    await pool.query(`
      CREATE INDEX "ChecklistRecebimento_dataCriacao_idx" ON "ChecklistRecebimento"("dataCriacao");
      CREATE INDEX "ChecklistRecebimento_dataRecebimento_idx" ON "ChecklistRecebimento"("dataRecebimento");
      CREATE INDEX "ChecklistRecebimento_nomeConferente_idx" ON "ChecklistRecebimento"("nomeConferente");
      CREATE INDEX "ChecklistRecebimento_nomeFabricante_idx" ON "ChecklistRecebimento"("nomeFabricante");
    `);

    console.log('✅ Tabela ChecklistRecebimento criada com sucesso!');

    // Verificar criação
    const countResult = await pool.query('SELECT COUNT(*) as total FROM "ChecklistRecebimento"');
    console.log(`📊 Registros na tabela: ${countResult.rows[0].total}`);

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  } finally {
    await pool.end();
  }
}

criarTabelaDireto();
