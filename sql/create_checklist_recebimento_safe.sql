-- SQL Idempotente para criar ChecklistRecebimento e enum CondicaoEmbalagem
-- Seguro para rodar em produção (não afeta dados existentes)

BEGIN;

-- 1. Criar enum CondicaoEmbalagem se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'condicaoembalagem') THEN
    CREATE TYPE "CondicaoEmbalagem" AS ENUM ('OTIMA', 'BOA', 'RUIM');
  END IF;
END$$;

-- 2. Criar tabela ChecklistRecebimento se não existir
CREATE TABLE IF NOT EXISTS "ChecklistRecebimento" (
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
);

-- 3. Criar índices se não existirem
DO $$
BEGIN
  -- Índice para dataCriacao
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'checklist_recebimento_data_criacao_idx' AND n.nspname = 'public') THEN
    CREATE INDEX "checklist_recebimento_data_criacao_idx" ON "ChecklistRecebimento"("dataCriacao");
  END IF;

  -- Índice para dataRecebimento
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'checklist_recebimento_data_recebimento_idx' AND n.nspname = 'public') THEN
    CREATE INDEX "checklist_recebimento_data_recebimento_idx" ON "ChecklistRecebimento"("dataRecebimento");
  END IF;

  -- Índice para nomeConferente
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'checklist_recebimento_nome_conferente_idx' AND n.nspname = 'public') THEN
    CREATE INDEX "checklist_recebimento_nome_conferente_idx" ON "ChecklistRecebimento"("nomeConferente");
  END IF;

  -- Índice para nomeFabricante
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'checklist_recebimento_nome_fabricante_idx' AND n.nspname = 'public') THEN
    CREATE INDEX "checklist_recebimento_nome_fabricante_idx" ON "ChecklistRecebimento"("nomeFabricante");
  END IF;

  -- Índice para alertaValidadeAutorizado
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'checklist_recebimento_alerta_validade_idx' AND n.nspname = 'public') THEN
    CREATE INDEX "checklist_recebimento_alerta_validade_idx" ON "ChecklistRecebimento"("alertaValidadeAutorizado");
  END IF;
END$$;

-- 4. Verificar se tudo foi criado corretamente
DO $$
DECLARE
  enum_exists boolean;
  table_exists boolean;
BEGIN
  -- Verificar enum
  SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'condicaoembalagem'
  ) INTO enum_exists;

  -- Verificar tabela
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ChecklistRecebimento'
  ) INTO table_exists;

  -- Reportar status
  RAISE NOTICE 'Status da criação:';
  RAISE NOTICE '- Enum CondicaoEmbalagem: %', CASE WHEN enum_exists THEN 'OK' ELSE 'NÃO CRIADO' END;
  RAISE NOTICE '- Tabela ChecklistRecebimento: %', CASE WHEN table_exists THEN 'OK' ELSE 'NÃO CRIADA' END;
END$$;

COMMIT;