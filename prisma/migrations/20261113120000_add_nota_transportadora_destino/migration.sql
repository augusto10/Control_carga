ALTER TABLE "NotaFiscal"
ADD COLUMN "transportadoraDestino" "Transportadora";

CREATE INDEX "NotaFiscal_transportadoraDestino_controleId_idx"
ON "NotaFiscal"("transportadoraDestino", "controleId");
