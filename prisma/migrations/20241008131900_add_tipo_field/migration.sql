-- CreateEnum
CREATE TYPE "TipoPessoa" AS ENUM ('MOTORISTA', 'FUNCIONARIO', 'CLIENTE');

-- AlterTable
ALTER TABLE "Motorista" ADD COLUMN "tipo" "TipoPessoa" NOT NULL DEFAULT 'MOTORISTA';
