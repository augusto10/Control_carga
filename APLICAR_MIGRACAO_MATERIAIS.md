# Como Aplicar a Migração do Sistema de Materiais

## ⚠️ IMPORTANTE: Faça backup do banco antes!

## Passo 1: Gerar a migração
```bash
npx prisma migrate dev --name adicionar_historico_estoque
```

## Passo 2: Aplicar no banco de produção (quando estiver pronto)
```bash
npx prisma migrate deploy
```

## Passo 3: Gerar o Prisma Client atualizado
```bash
npx prisma generate
```

## O que foi adicionado:

### Novo Modelo: HistoricoEstoque
- Registra todas as movimentações de estoque (entrada, saída, ajuste)
- Guarda quantidade antes e depois
- Vincula ao usuário que fez a movimentação
- Pode vincular a uma solicitação (quando for saída por aprovação)

### Novo Enum: TipoMovimentacao
- ENTRADA: Quando adiciona estoque
- SAIDA: Quando remove estoque (aprovação de solicitação)
- AJUSTE: Quando corrige estoque manualmente

### Relações Adicionadas:
- MaterialEstoque.historicos
- Usuario.historicosEstoque

## Próximos passos após migração:
1. Implementar API para aprovar solicitações (com atualização de estoque)
2. Implementar API para adicionar estoque
3. Atualizar relatórios com novos dados
4. Criar tela de histórico de movimentações
