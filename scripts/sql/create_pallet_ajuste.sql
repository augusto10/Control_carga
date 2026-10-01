-- Cria a tabela PalletAjuste apenas se não existir (não destrutivo)
CREATE TABLE IF NOT EXISTS "PalletAjuste" (
  id uuid PRIMARY KEY,
  "dataCriacao" timestamptz NOT NULL DEFAULT now(),
  "dataRecebimento" timestamptz NOT NULL DEFAULT now(),
  motorista text NULL,
  transportadora text NULL,
  quantidade integer NOT NULL,
  observacao text NULL,
  "usuarioId" text NOT NULL,
  CONSTRAINT fk_usuario FOREIGN KEY ("usuarioId") REFERENCES "Usuario"(id) ON DELETE RESTRICT
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_data ON "PalletAjuste" ("dataRecebimento");
CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_transportadora ON "PalletAjuste" (transportadora);
CREATE INDEX IF NOT EXISTS idx_pallet_ajuste_usuario ON "PalletAjuste" ("usuarioId");
