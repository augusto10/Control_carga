-- Script para criar tabela ChecklistRecebimento com todas as permissões necessárias
-- Primeiro concede as permissões necessárias
DO $$
DECLARE
    _db_user TEXT;
BEGIN
    -- Pega o usuário atual
    SELECT current_user INTO _db_user;
    
    -- Concede permissões no schema public
    EXECUTE format('GRANT ALL ON SCHEMA public TO %I', _db_user);
    EXECUTE format('GRANT ALL ON ALL TABLES IN SCHEMA public TO %I', _db_user);
    EXECUTE format('GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO %I', _db_user);
    
    -- Configura permissões padrão para objetos futuros
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO %I', _db_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO %I', _db_user);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TYPES TO %I', _db_user);
    
    -- Permite criação de objetos no schema public
    EXECUTE format('GRANT CREATE ON SCHEMA public TO %I', _db_user);
END $$;

-- Cria o enum se não existir
DO $$
BEGIN
    CREATE TYPE "CondicaoEmbalagem" AS ENUM ('OTIMA', 'BOA', 'RUIM');
EXCEPTION 
    WHEN duplicate_object THEN NULL;
END $$;

-- Cria a tabela se não existir
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

-- Cria os índices se não existirem
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS "checklist_recebimento_data_criacao_idx" ON "ChecklistRecebimento"("dataCriacao");
    CREATE INDEX IF NOT EXISTS "checklist_recebimento_data_recebimento_idx" ON "ChecklistRecebimento"("dataRecebimento");
    CREATE INDEX IF NOT EXISTS "checklist_recebimento_nome_conferente_idx" ON "ChecklistRecebimento"("nomeConferente");
    CREATE INDEX IF NOT EXISTS "checklist_recebimento_nome_fabricante_idx" ON "ChecklistRecebimento"("nomeFabricante");
    CREATE INDEX IF NOT EXISTS "checklist_recebimento_alerta_validade_idx" ON "ChecklistRecebimento"("alertaValidadeAutorizado");
END $$;