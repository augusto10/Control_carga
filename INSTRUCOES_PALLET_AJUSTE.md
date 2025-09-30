# 🔧 RESOLVER: Funcionalidade de Ajustes de Pallets Indisponível

## ❌ Problema Identificado
A tabela `PalletAjuste` não existe no banco de dados, causando a mensagem de erro na tela de relatórios de pallets.

## ✅ Soluções Disponíveis

### 🎯 OPÇÃO 1: Criação Manual no Console Neon (RECOMENDADA)

1. Acesse o console do Neon em: https://neon.tech
2. Faça login na sua conta
3. Selecione seu projeto/banco de dados
4. Vá para a aba "SQL Editor" ou "Query"
5. Execute o seguinte SQL:

```sql
-- Criar tabela PalletAjuste
CREATE TABLE "PalletAjuste" (
  "id" TEXT NOT NULL,
  "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dataRecebimento" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "motorista" TEXT,
  "transportadora" TEXT,
  "quantidade" INTEGER NOT NULL,
  "observacao" TEXT,
  "usuarioId" TEXT NOT NULL,
  CONSTRAINT "PalletAjuste_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PalletAjuste_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Criar índices para performance
CREATE INDEX "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");
CREATE INDEX "PalletAjuste_transportadora_idx" ON "PalletAjuste"("transportadora");
CREATE INDEX "PalletAjuste_usuarioId_idx" ON "PalletAjuste"("usuarioId");
```

### 🎯 OPÇÃO 2: Reset Completo do Banco (CUIDADO!)

⚠️ **ATENÇÃO: Esta opção irá APAGAR todos os dados do banco!**

```bash
npx prisma db push --force-reset
```

### 🎯 OPÇÃO 3: Configurar URL Direta

1. No arquivo `.env`, adicione uma linha com a URL direta do PostgreSQL:
```env
DIRECT_URL="postgresql://usuario:senha@host:5432/database"
```

2. Execute a migração:
```bash
npx prisma migrate dev --name add_pallet_ajuste
```

## 🧪 Verificar se Funcionou

Após executar qualquer uma das opções acima, execute:

```bash
node fix-pallet-ajuste.js
```

## 📋 Funcionalidades que Serão Habilitadas

Após criar a tabela, as seguintes funcionalidades estarão disponíveis:

1. **Modal de Ajustes de Pallets** no relatório de pallets
2. **Registro de devoluções avulsas** de pallets
3. **Soma automática** dos ajustes nos relatórios
4. **Histórico completo** de movimentação de pallets
5. **Recibos em PDF** dos ajustes registrados

## 🔍 Status Atual

- ✅ Código implementado e funcional
- ✅ APIs criadas e testadas
- ✅ Interface completa desenvolvida
- ❌ Tabela no banco de dados (precisa ser criada)

## 📞 Suporte

Se encontrar dificuldades, execute o script de diagnóstico:
```bash
node fix-pallet-ajuste.js
```

O script fornecerá informações detalhadas sobre o status e próximos passos.
