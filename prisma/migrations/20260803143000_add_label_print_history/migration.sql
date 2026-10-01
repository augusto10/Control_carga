CREATE TABLE "label_print_history" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "codigoAdm" TEXT NOT NULL,
    "nomeProduto" TEXT NOT NULL,
    "marcaProduto" TEXT,
    "codigoBarras" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "impressora" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "mensagemErro" TEXT,

    CONSTRAINT "label_print_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "label_print_history_usuarioId_idx" ON "label_print_history"("usuarioId");
CREATE INDEX "label_print_history_produtoId_idx" ON "label_print_history"("produtoId");
CREATE INDEX "label_print_history_codigoAdm_idx" ON "label_print_history"("codigoAdm");
CREATE INDEX "label_print_history_dataCriacao_idx" ON "label_print_history"("dataCriacao");

ALTER TABLE "label_print_history"
ADD CONSTRAINT "label_print_history_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
