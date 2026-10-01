CREATE TABLE IF NOT EXISTS "RotaPrazoEntrega" (
  "id" TEXT NOT NULL,
  "codigo" TEXT NOT NULL,
  "uf" TEXT NOT NULL,
  "prazo" TEXT NOT NULL,
  "regiao" TEXT NOT NULL,
  "transportadora" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RotaPrazoEntrega_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RotaPrazoEntrega_codigo_transportadora_key"
  ON "RotaPrazoEntrega"("codigo", "transportadora");
CREATE INDEX IF NOT EXISTS "RotaPrazoEntrega_uf_idx"
  ON "RotaPrazoEntrega"("uf");
CREATE INDEX IF NOT EXISTS "RotaPrazoEntrega_regiao_idx"
  ON "RotaPrazoEntrega"("regiao");
CREATE INDEX IF NOT EXISTS "RotaPrazoEntrega_transportadora_idx"
  ON "RotaPrazoEntrega"("transportadora");