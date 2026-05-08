CREATE INDEX CONCURRENTLY IF NOT EXISTS "ControleCarga_dataCriacao_idx" ON "ControleCarga" ("dataCriacao");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ControleCarga_finalizado_idx" ON "ControleCarga" ("finalizado");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Pedido_dataCriacao_idx" ON "Pedido" ("dataCriacao");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "NotaFiscal_dataCriacao_idx" ON "NotaFiscal" ("dataCriacao");
