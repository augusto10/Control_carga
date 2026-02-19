# Sistema de Ajustes de Pallets - Documentação

## Status Atual

O sistema de ajustes de pallets está **parcialmente implementado** mas a funcionalidade está **temporariamente indisponível** porque a tabela `PalletAjuste` não existe no banco de dados de produção.

## Problema Identificado

- ✅ **Código implementado**: Todas as APIs e interfaces estão prontas
- ❌ **Tabela ausente**: A tabela `PalletAjuste` não foi criada no banco de dados
- ✅ **Tratamento de erro**: Sistema mostra mensagem adequada quando tabela não existe
- ✅ **Relatórios funcionam**: O relatório de pallets funciona normalmente (sem os ajustes)

## Comportamento Atual

Quando o usuário tenta usar a funcionalidade de "Ajustes de Pallets":

1. **Interface aparece normalmente** - Modal abre e permite preenchimento
2. **Ao salvar**: Sistema mostra mensagem de erro explicativa:
   ```
   ⚠️ Funcionalidade de ajustes de pallets temporariamente indisponível
   
   A tabela PalletAjuste não foi criada no banco de dados ainda. 
   Entre em contato com o administrador do sistema.
   ```
3. **PDF não é gerado** - Porque o salvamento falha antes

## Solução para Ativar a Funcionalidade

### Opção 1: Executar Script Automático (Recomendado)
```bash
# No diretório do projeto
node scripts/check-pallet-ajuste.js
```

### Opção 2: SQL Manual no Banco
Execute este SQL diretamente no banco de dados:

```sql
CREATE TABLE IF NOT EXISTS "PalletAjuste" (
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

CREATE INDEX IF NOT EXISTS "PalletAjuste_dataRecebimento_idx" ON "PalletAjuste"("dataRecebimento");
```

### Opção 3: Prisma Push (Se Possível)
```bash
npx prisma db push
```

## Após Criar a Tabela

1. **Funcionalidade ativada automaticamente** - Não precisa reiniciar servidor
2. **Ajustes podem ser salvos** - Modal funcionará normalmente  
3. **PDF será gerado** - Recibo será criado automaticamente
4. **Relatórios incluirão ajustes** - Dados aparecerão nos relatórios

## Arquivos Relacionados

- `pages/api/pallets/ajustes.ts` - API principal
- `pages/relatorios/pallets.tsx` - Interface do usuário
- `pages/api/relatorios/pallets.ts` - Relatório (já trata tabela ausente)
- `prisma/schema.prisma` - Modelo da tabela (linha 189-200)
- `scripts/check-pallet-ajuste.js` - Script de verificação/criação

## Funcionalidades Disponíveis Após Ativação

- ✅ **Registrar devoluções avulsas** de pallets
- ✅ **Gerar PDF de recibo** automaticamente
- ✅ **Filtrar por período, transportadora, motorista**
- ✅ **Integração com relatórios** existentes
- ✅ **Soma automática** nos totais de pallets devolvidos

## Segurança

- ✅ **Autenticação JWT** obrigatória
- ✅ **Validação de dados** na API
- ✅ **Tratamento de erros** robusto
- ✅ **Não quebra sistema** se tabela não existir

---

**Data da documentação**: 29/09/2025  
**Status**: Aguardando criação da tabela PalletAjuste no banco de produção
