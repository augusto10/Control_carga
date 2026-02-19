-- CreateEnum
CREATE TYPE "Transportadora" AS ENUM ('ACERT', 'EXPRESSO_GOIAS');

-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'GERENTE', 'USUARIO', 'FUNCIONARIO', 'CLIENTE');

-- CreateTable
CREATE TABLE "ControleCarga" (
    "id" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "motorista" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,
    "transportadora" "Transportadora" NOT NULL DEFAULT 'ACERT',
    "numeroManifesto" TEXT,
    "qtdPallets" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,
    "finalizado" BOOLEAN NOT NULL DEFAULT false,
    "cpfMotorista" TEXT NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "ControleCarga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaFiscal" (
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
CREATE TABLE "Usuario" (
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

-- CreateTable
CREATE TABLE "auditoria_acesso" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "descricao" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_acesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracaoSistema" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'string',
    "opcoes" TEXT,
    "editavel" BOOLEAN NOT NULL DEFAULT true,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAtualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoSistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "auditoria_acesso_usuarioId_idx" ON "auditoria_acesso"("usuarioId");

-- CreateIndex
CREATE INDEX "auditoria_acesso_dataHora_idx" ON "auditoria_acesso"("dataHora");

-- CreateIndex
CREATE UNIQUE INDEX "ConfiguracaoSistema_chave_key" ON "ConfiguracaoSistema"("chave");

-- CreateIndex
CREATE INDEX "ConfiguracaoSistema_chave_idx" ON "ConfiguracaoSistema"("chave");
