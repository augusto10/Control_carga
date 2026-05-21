DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum
        WHERE enumlabel = 'ZANUELO_TRANSPORTE_LOGISTICA'
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'Transportadora'
        )
    ) THEN
        ALTER TYPE "Transportadora" ADD VALUE 'ZANUELO_TRANSPORTE_LOGISTICA';
    END IF;
END $$;
