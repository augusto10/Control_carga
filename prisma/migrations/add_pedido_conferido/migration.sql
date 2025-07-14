-- Criar a tabela PedidoConferido
CREATE TABLE "PedidoConferido" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedidoId" TEXT NOT NULL,
    "conferenteId" TEXT NOT NULL,
    "pedido100" BOOLEAN NOT NULL,
    "inconsistencia" BOOLEAN NOT NULL,
    "motivosInconsistencia" TEXT[] NOT NULL,
    "observacoes" TEXT,
    CONSTRAINT "PedidoConferido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PedidoConferido_conferenteId_fkey" FOREIGN KEY ("conferenteId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Criar índice para melhorar consultas por pedido
CREATE UNIQUE INDEX "PedidoConferido_pedidoId_key" ON "PedidoConferido"("pedidoId");

-- Adicionar a relação opcional na tabela Pedido
ALTER TABLE "Pedido" ADD COLUMN "conferidoId" TEXT;
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_conferidoId_fkey" 
    FOREIGN KEY ("conferidoId") REFERENCES "PedidoConferido" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
