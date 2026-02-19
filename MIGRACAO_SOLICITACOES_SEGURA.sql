-- MIGRAÇÃO SEGURA PARA SOLICITACOES MATERIAL (SEM PERDER DADOS)
-- Execute apenas as alterações necessárias na produção

DO $$
BEGIN
    -- 1. Renomear coluna observacoes para observacao na tabela SolicitacaoMaterial
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SolicitacaoMaterial' AND column_name = 'observacoes') THEN
        ALTER TABLE "SolicitacaoMaterial" RENAME COLUMN observacoes TO observacao;
        RAISE NOTICE 'Coluna observacoes renomeada para observacao';
    ELSE
        RAISE NOTICE 'Coluna observacao já existe ou não precisa ser renomeada';
    END IF;

    -- 2. Adicionar coluna dataAtualizacao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SolicitacaoMaterial' AND column_name = 'dataAtualizacao') THEN
        ALTER TABLE "SolicitacaoMaterial" ADD COLUMN "dataAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Coluna dataAtualizacao adicionada';
    END IF;

    -- 3. Adicionar coluna aprovadorId se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SolicitacaoMaterial' AND column_name = 'aprovadorId') THEN
        ALTER TABLE "SolicitacaoMaterial" ADD COLUMN "aprovadorId" TEXT;
        RAISE NOTICE 'Coluna aprovadorId adicionada';
    END IF;

    -- 4. Adicionar coluna dataAprovacao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SolicitacaoMaterial' AND column_name = 'dataAprovacao') THEN
        ALTER TABLE "SolicitacaoMaterial" ADD COLUMN "dataAprovacao" TIMESTAMP(3);
        RAISE NOTICE 'Coluna dataAprovacao adicionada';
    END IF;

    -- 5. Adicionar coluna motivoRejeicao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SolicitacaoMaterial' AND column_name = 'motivoRejeicao') THEN
        ALTER TABLE "SolicitacaoMaterial" ADD COLUMN "motivoRejeicao" TEXT;
        RAISE NOTICE 'Coluna motivoRejeicao adicionada';
    END IF;

    -- 6. Renomear colunas na tabela ItemSolicitacaoMaterial
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ItemSolicitacaoMaterial' AND column_name = 'quantidadeSolicitada') THEN
        ALTER TABLE "ItemSolicitacaoMaterial" RENAME COLUMN "quantidadeSolicitada" TO quantidade;
        RAISE NOTICE 'Coluna quantidadeSolicitada renomeada para quantidade';
    END IF;

    -- 7. Adicionar coluna observacao se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ItemSolicitacaoMaterial' AND column_name = 'observacao') THEN
        ALTER TABLE "ItemSolicitacaoMaterial" ADD COLUMN observacao TEXT;
        RAISE NOTICE 'Coluna observacao adicionada';
    END IF;

    -- 8. Verificar se as tabelas de materiais existem
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MaterialEstoque') THEN
        -- Criar tabela MaterialEstoque se não existir
        CREATE TABLE "MaterialEstoque" (
            "id" TEXT NOT NULL,
            "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "dataAtualizacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "nome" TEXT NOT NULL,
            "descricao" TEXT,
            "unidadeMedida" TEXT NOT NULL DEFAULT 'UN',
            "quantidadeEstoque" INTEGER NOT NULL DEFAULT 0,
            "estoqueMinimo" INTEGER NOT NULL DEFAULT 0,
            "valor" FLOAT,
            "ativo" BOOLEAN NOT NULL DEFAULT true,
            CONSTRAINT "MaterialEstoque_pkey" PRIMARY KEY ("id")
        );
        RAISE NOTICE 'Tabela MaterialEstoque criada';

        -- Inserir materiais básicos
        INSERT INTO "MaterialEstoque" ("id", "nome", "descricao", "unidadeMedida", "quantidadeEstoque", "estoqueMinimo")
        SELECT
            gen_random_uuid(),
            'Fita Adesiva',
            'Fita adesiva transparente 48mm x 100m',
            'Rolo',
            50,
            10
        WHERE NOT EXISTS (SELECT 1 FROM "MaterialEstoque" WHERE nome = 'Fita Adesiva');
    END IF;

    RAISE NOTICE '=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===';
    RAISE NOTICE 'Nenhum dado foi perdido durante o processo';

END $$;
