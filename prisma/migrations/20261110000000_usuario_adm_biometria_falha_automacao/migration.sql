-- Novos campos de autenticação do separador no totem
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "codigoAdm" INTEGER;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "senhaAdm" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "biometria" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_codigoAdm_key" ON "Usuario"("codigoAdm");
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_biometria_key" ON "Usuario"("biometria");

-- Novo status descritivo para falha do agente de automação
ALTER TYPE "StatusPedidoSeparacao" ADD VALUE IF NOT EXISTS 'FALHA_AUTOMACAO';
