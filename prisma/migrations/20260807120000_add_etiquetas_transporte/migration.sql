-- Tabelas do Sistema de Etiquetas de Transporte (Zebra ZD-220)
-- Cria EtiquetaLote (lote de etiquetas por pedido) e EtiquetaVolume (volume com codigo de barras unico)

CREATE TABLE IF NOT EXISTS "EtiquetaLote" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codigoBarras" TEXT NOT NULL DEFAULT '',
    "numeroNota" TEXT NOT NULL DEFAULT '',
    "cliente" TEXT NOT NULL DEFAULT '',
    "transportadora" "Transportadora" NOT NULL DEFAULT 'ACCERT',
    "numeroPedido" TEXT NOT NULL,
    "volumes" INTEGER NOT NULL,
    "observacoes" TEXT,
    "criadoPor" TEXT NOT NULL,

    CONSTRAINT "EtiquetaLote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EtiquetaVolume" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "indiceVolume" INTEGER NOT NULL,
    "totalVolumes" INTEGER NOT NULL,
    "codigoVolume" TEXT NOT NULL,
    "impressoEm" TIMESTAMP(3),

    CONSTRAINT "EtiquetaVolume_pkey" PRIMARY KEY ("id")
);

-- Indices
CREATE UNIQUE INDEX IF NOT EXISTS "EtiquetaVolume_codigoVolume_key" ON "EtiquetaVolume"("codigoVolume");

CREATE INDEX IF NOT EXISTS "EtiquetaLote_dataCriacao_idx" ON "EtiquetaLote"("dataCriacao");
CREATE INDEX IF NOT EXISTS "EtiquetaLote_codigoBarras_idx" ON "EtiquetaLote"("codigoBarras");
CREATE INDEX IF NOT EXISTS "EtiquetaLote_numeroNota_idx" ON "EtiquetaLote"("numeroNota");
CREATE INDEX IF NOT EXISTS "EtiquetaLote_numeroPedido_idx" ON "EtiquetaLote"("numeroPedido");
CREATE INDEX IF NOT EXISTS "EtiquetaLote_criadoPor_idx" ON "EtiquetaLote"("criadoPor");

CREATE INDEX IF NOT EXISTS "EtiquetaVolume_loteId_idx" ON "EtiquetaVolume"("loteId");
CREATE INDEX IF NOT EXISTS "EtiquetaVolume_codigoVolume_idx" ON "EtiquetaVolume"("codigoVolume");
CREATE INDEX IF NOT EXISTS "EtiquetaVolume_impressoEm_idx" ON "EtiquetaVolume"("impressoEm");

-- Chaves estrangeiras
ALTER TABLE "EtiquetaLote"
ADD CONSTRAINT "EtiquetaLote_criadoPor_fkey"
FOREIGN KEY ("criadoPor") REFERENCES "Usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EtiquetaVolume"
ADD CONSTRAINT "EtiquetaVolume_loteId_fkey"
FOREIGN KEY ("loteId") REFERENCES "EtiquetaLote"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
