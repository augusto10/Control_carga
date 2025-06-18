/*
  Warnings:

  - Added the required column `valor` to the `NotaFiscal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "NotaFiscal" ADD COLUMN     "valor" DOUBLE PRECISION NOT NULL;
