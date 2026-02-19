-- AlterEnum
ALTER TYPE "Transportadora" ADD VALUE 'ACCERT';

-- AlterTable
ALTER TABLE "ControleCarga" ALTER COLUMN "transportadora" SET DEFAULT 'ACCERT';

-- CreateTable
CREATE TABLE "Motorista" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "cnh" TEXT NOT NULL,
    "transportadoraId" "Transportadora" NOT NULL,

    CONSTRAINT "Motorista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Motorista_cpf_key" ON "Motorista"("cpf");
