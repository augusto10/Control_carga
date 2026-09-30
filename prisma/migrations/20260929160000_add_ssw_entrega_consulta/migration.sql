CREATE TABLE IF NOT EXISTS "SswEntregaConsulta" (
  "chaveNfe" TEXT NOT NULL,
  "pedidoId" INTEGER,
  "numeroNota" TEXT,
  "transportadoraNome" TEXT,
  "situacao" TEXT NOT NULL,
  "entregue" BOOLEAN NOT NULL DEFAULT false,
  "sswStatus" TEXT,
  "dataEntrega" TEXT,
  "consultadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "proximaConsultaEm" TIMESTAMP(3),
  "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SswEntregaConsulta_pkey" PRIMARY KEY ("chaveNfe")
);

CREATE INDEX IF NOT EXISTS "SswEntregaConsulta_pedidoId_idx"
  ON "SswEntregaConsulta"("pedidoId");

CREATE INDEX IF NOT EXISTS "SswEntregaConsulta_entregue_proximaConsultaEm_idx"
  ON "SswEntregaConsulta"("entregue", "proximaConsultaEm");
