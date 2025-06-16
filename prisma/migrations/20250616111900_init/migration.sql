-- CreateEnum
CREATE TYPE "public"."Transportadora" AS ENUM ('ACERT', 'EXPRESSO_GOIAS');

-- CreateEnum
CREATE TYPE "public"."TipoUsuario" AS ENUM ('ADMIN', 'USUARIO');

-- CreateTable
CREATE TABLE "public"."ControleCarga" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motorista" TEXT NOT NULL,
    "cpfMotorista" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "transportadora" "Transportadora" NOT NULL DEFAULT 'ACERT',
    "numeroManifesto" TEXT NOT NULL,
    "qtdPallets" INTEGER NOT NULL,
    "observacao" TEXT,
    "finalizado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ControleCarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NotaFiscal" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "codigo" TEXT NOT NULL,
    "numeroNota" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "controleId" TEXT,
    "usuarioId" TEXT,

    CONSTRAINT "NotaFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "tipo" "TipoUsuario" NOT NULL DEFAULT 'USUARIO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcesso" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "public"."Usuario"("email");

-- AddForeignKey
ALTER TABLE "public"."NotaFiscal" ADD CONSTRAINT "NotaFiscal_controleId_fkey" FOREIGN KEY ("controleId") REFERENCES "public"."ControleCarga"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotaFiscal" ADD CONSTRAINT "NotaFiscal_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
