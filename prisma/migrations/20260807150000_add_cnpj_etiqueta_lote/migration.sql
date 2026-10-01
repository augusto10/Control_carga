-- Adiciona o CNPJ do cliente na tabela de lotes de etiquetas de transporte.
-- CNPJ exibido na etiqueta ZPL junto ao nome do cliente.

ALTER TABLE "EtiquetaLote" ADD COLUMN IF NOT EXISTS "cnpj" TEXT;
