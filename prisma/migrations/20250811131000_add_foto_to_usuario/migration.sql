-- Add optional column `foto` to `Usuario`
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "foto" TEXT;
