CREATE TABLE IF NOT EXISTS "PedidoLogisticaSnapshot" (
  "id" TEXT NOT NULL,
  "pedidoId" INTEGER NOT NULL,
  "tipoEntrega" TEXT,
  "clienteNome" TEXT,
  "nomeFantasia" TEXT,
  "valorPedido" DOUBLE PRECISION,
  "dataHoraRecebimento" TIMESTAMP(3),
  "dataRecebimentoDia" TIMESTAMP(3),
  "previsaoEntrega" TIMESTAMP(3),
  "localNome" TEXT,
  "statusCodigo" TEXT,
  "statusSeparacao" TEXT,
  "statusLogisticoCodigo" TEXT,
  "situacaoAtual" TEXT,
  "usuarioConfirmacaoNome" TEXT,
  "dataHoraConfirmacao" TIMESTAMP(3),
  "numeroNota" TEXT,
  "chaveNfe" TEXT,
  "embarcadoNoControle" BOOLEAN NOT NULL DEFAULT false,
  "numeroManifesto" TEXT,
  "transportadoraNome" TEXT,
  "dataHoraControle" TIMESTAMP(3),
  "possuiPendencia" BOOLEAN NOT NULL DEFAULT false,
  "totalItensPendentes" INTEGER NOT NULL DEFAULT 0,
  "produtosPendentes" JSONB,
  "assinatura" TEXT NOT NULL,
  "rawPedido" JSONB,
  "rawLogistica" JSONB,
  "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sincronizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PedidoLogisticaSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SincronizacaoLogistica" (
  "chave" TEXT NOT NULL,
  "dataInicio" TIMESTAMP(3),
  "dataFim" TIMESTAMP(3),
  "totalLidos" INTEGER NOT NULL DEFAULT 0,
  "totalAtualizados" INTEGER NOT NULL DEFAULT 0,
  "totalComErro" INTEGER NOT NULL DEFAULT 0,
  "ultimoErro" TEXT,
  "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimaSincronizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SincronizacaoLogistica_pkey" PRIMARY KEY ("chave")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PedidoLogisticaSnapshot_pedidoId_key" ON "PedidoLogisticaSnapshot"("pedidoId");
CREATE INDEX IF NOT EXISTS "PedidoLogisticaSnapshot_dataRecebimentoDia_idx" ON "PedidoLogisticaSnapshot"("dataRecebimentoDia");
CREATE INDEX IF NOT EXISTS "PedidoLogisticaSnapshot_sincronizadoEm_idx" ON "PedidoLogisticaSnapshot"("sincronizadoEm");
CREATE INDEX IF NOT EXISTS "PedidoLogisticaSnapshot_statusCodigo_idx" ON "PedidoLogisticaSnapshot"("statusCodigo");
CREATE INDEX IF NOT EXISTS "PedidoLogisticaSnapshot_possuiPendencia_idx" ON "PedidoLogisticaSnapshot"("possuiPendencia");
CREATE INDEX IF NOT EXISTS "PedidoLogisticaSnapshot_embarcadoNoControle_idx" ON "PedidoLogisticaSnapshot"("embarcadoNoControle");
