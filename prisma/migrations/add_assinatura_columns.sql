-- Adiciona as colunas de assinatura à tabela "ControleCarga"
ALTER TABLE "ControleCarga"
ADD COLUMN "assinaturaMotorista" TEXT,
ADD COLUMN "assinaturaResponsavel" TEXT,
ADD COLUMN "dataAssinaturaMotorista" TIMESTAMP(3),
ADD COLUMN "dataAssinaturaResponsavel" TIMESTAMP(3);
