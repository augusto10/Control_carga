-- Enum de status da separação
DO $$ BEGIN
  CREATE TYPE "StatusPedidoSeparacao" AS ENUM ('EM_SEPARACAO', 'FINALIZADO', 'CANCELADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Fila/atribuição de pedidos para separadores (e futura conferência)
CREATE TABLE IF NOT EXISTS "Pedidos" (
  "id" TEXT NOT NULL,
  "pedidoId" INTEGER NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "status" "StatusPedidoSeparacao" NOT NULL DEFAULT 'EM_SEPARACAO',
  "jobId" TEXT,
  "dataAssociacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataFim" TIMESTAMP(3),

  CONSTRAINT "Pedidos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Pedidos_usuarioId_fkey" FOREIGN KEY ("usuarioId")
    REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Pedidos_status_dataAssociacao_idx"
  ON "Pedidos"("status", "dataAssociacao");
CREATE INDEX IF NOT EXISTS "Pedidos_usuarioId_status_idx"
  ON "Pedidos"("usuarioId", "status");
CREATE INDEX IF NOT EXISTS "Pedidos_pedidoId_idx"
  ON "Pedidos"("pedidoId");

-- Regras de exclusividade por status ativo (índice parcial — não suportado pelo Prisma):
-- um pedido só pode ter uma separação ativa e um separador só pode ter um pedido ativo.
CREATE UNIQUE INDEX IF NOT EXISTS "Pedidos_pedidoId_ativo_key"
  ON "Pedidos"("pedidoId") WHERE "status" = 'EM_SEPARACAO';
CREATE UNIQUE INDEX IF NOT EXISTS "Pedidos_usuarioId_ativo_key"
  ON "Pedidos"("usuarioId") WHERE "status" = 'EM_SEPARACAO';
