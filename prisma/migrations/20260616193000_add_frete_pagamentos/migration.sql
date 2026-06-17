ALTER TABLE "ControleCarga"
ADD COLUMN IF NOT EXISTS "fretePago" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ControleCarga"
ADD COLUMN IF NOT EXISTS "fretePagoEm" TIMESTAMP(3);

ALTER TABLE "ControleCarga"
ADD COLUMN IF NOT EXISTS "fretePagamentoId" TEXT;

CREATE TABLE IF NOT EXISTS "FretePagamento" (
  "id" TEXT NOT NULL,
  "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataPagamento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "valorTotal" DOUBLE PRECISION NOT NULL,
  "comprovante" TEXT,
  "observacao" TEXT,
  "criadoPor" TEXT NOT NULL,
  CONSTRAINT "FretePagamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FretePagamentoControle" (
  "id" TEXT NOT NULL,
  "fretePagamentoId" TEXT NOT NULL,
  "controleId" TEXT NOT NULL,
  "valorFrete" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "FretePagamentoControle_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FretePagamento_dataCriacao_idx" ON "FretePagamento"("dataCriacao");
CREATE INDEX IF NOT EXISTS "FretePagamento_dataPagamento_idx" ON "FretePagamento"("dataPagamento");
CREATE INDEX IF NOT EXISTS "FretePagamento_criadoPor_idx" ON "FretePagamento"("criadoPor");
CREATE INDEX IF NOT EXISTS "FretePagamentoControle_fretePagamentoId_idx" ON "FretePagamentoControle"("fretePagamentoId");
CREATE INDEX IF NOT EXISTS "FretePagamentoControle_controleId_idx" ON "FretePagamentoControle"("controleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FretePagamentoControle_controleId_key'
  ) THEN
    ALTER TABLE "FretePagamentoControle" ADD CONSTRAINT "FretePagamentoControle_controleId_key" UNIQUE ("controleId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FretePagamento_criadoPor_fkey'
  ) THEN
    ALTER TABLE "FretePagamento" ADD CONSTRAINT "FretePagamento_criadoPor_fkey"
    FOREIGN KEY ("criadoPor") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FretePagamentoControle_fretePagamentoId_fkey'
  ) THEN
    ALTER TABLE "FretePagamentoControle" ADD CONSTRAINT "FretePagamentoControle_fretePagamentoId_fkey"
    FOREIGN KEY ("fretePagamentoId") REFERENCES "FretePagamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'FretePagamentoControle_controleId_fkey'
  ) THEN
    ALTER TABLE "FretePagamentoControle" ADD CONSTRAINT "FretePagamentoControle_controleId_fkey"
    FOREIGN KEY ("controleId") REFERENCES "ControleCarga"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ControleCarga_fretePagamentoId_fkey'
  ) THEN
    ALTER TABLE "ControleCarga" ADD CONSTRAINT "ControleCarga_fretePagamentoId_fkey"
    FOREIGN KEY ("fretePagamentoId") REFERENCES "FretePagamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
