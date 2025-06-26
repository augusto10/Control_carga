-- Add the volumes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'NotaFiscal' AND column_name = 'volumes') THEN
        ALTER TABLE "NotaFiscal" ADD COLUMN "volumes" TEXT NOT NULL DEFAULT '1';
    END IF;
END $$;
