-- Adicionar campos para alertas de validade no checklist de recebimento
-- Migration: add_validade_fields

-- Adicionar campos para controle de alertas de validade
ALTER TABLE "ChecklistRecebimento" 
ADD COLUMN IF NOT EXISTS "alertaValidadeAutorizado" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "nomeAutorizadorLider" TEXT,
ADD COLUMN IF NOT EXISTS "produtosComAlertaValidade" TEXT;

-- Comentários para documentação
COMMENT ON COLUMN "ChecklistRecebimento"."alertaValidadeAutorizado" IS 'Indica se houve autorização para produtos com validade inferior a 8 meses';
COMMENT ON COLUMN "ChecklistRecebimento"."nomeAutorizadorLider" IS 'Nome do líder que autorizou prosseguir com produtos próximos ao vencimento';
COMMENT ON COLUMN "ChecklistRecebimento"."produtosComAlertaValidade" IS 'JSON com lista dos produtos que tiveram alerta de validade';

-- Criar índice para consultas de relatórios de validade
CREATE INDEX IF NOT EXISTS "idx_checklist_alerta_validade" ON "ChecklistRecebimento" ("alertaValidadeAutorizado", "dataRecebimento");
CREATE INDEX IF NOT EXISTS "idx_checklist_autorizador" ON "ChecklistRecebimento" ("nomeAutorizadorLider") WHERE "nomeAutorizadorLider" IS NOT NULL;
