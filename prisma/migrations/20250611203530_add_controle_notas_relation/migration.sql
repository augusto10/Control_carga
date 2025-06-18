-- CreateTable
CREATE TABLE "ControleCarga" (
    "id" TEXT NOT NULL,
    "motorista" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ControleCarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaFiscal" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numeroNota" TEXT NOT NULL,
    "controleId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaFiscal_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NotaFiscal" ADD CONSTRAINT "NotaFiscal_controleId_fkey" FOREIGN KEY ("controleId") REFERENCES "ControleCarga"("id") ON DELETE SET NULL ON UPDATE CASCADE;
