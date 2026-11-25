ALTER TABLE "SswEntregaConsulta"
ADD COLUMN IF NOT EXISTS "trackingPayload" JSONB;

CREATE INDEX IF NOT EXISTS "SswEntregaConsulta_proximaConsultaEm_idx"
ON "SswEntregaConsulta"("proximaConsultaEm");
