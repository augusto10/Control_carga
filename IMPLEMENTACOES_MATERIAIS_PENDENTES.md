# Implementações Pendentes - Sistema de Materiais

## ✅ JÁ IMPLEMENTADO:
1. Menu com permissões corretas (SEPARADORES e CONFERENTES podem solicitar materiais)
2. Campo valor aceita ponto e vírgula
3. Sistema básico de solicitação e aprovação

## 📋 PENDENTE DE IMPLEMENTAÇÃO:

### 1. Registrar Aprovador nas Solicitações
**Arquivo**: `pages/api/materiais/solicitacoes/[id].ts`
- Ao aprovar, salvar `aprovadorId` e `dataAprovacao`
- O aprovador deve ser o usuário logado (GERENTE)

### 2. Atualizar Relatórios com Informações Completas
**Arquivo**: `pages/materiais/relatorios.tsx` e `pages/api/relatorios/materiais.ts`

Adicionar ao relatório:
- **Valor total** de cada material solicitado
- **Quantidade consumida** (soma de todas as solicitações aprovadas)
- **Estoque atual** de cada material
- **Sugestão de reposição** baseada no consumo médio
- **Nome do aprovador** em cada solicitação

Cálculo da sugestão de reposição:
```typescript
// Consumo médio mensal
const consumoMedio = totalConsumido / mesesAnalisados;

// Sugestão: se estoque < consumo médio * 2, sugerir reposição
if (estoqueAtual < consumoMedio * 2) {
  sugestaoReposicao = (consumoMedio * 3) - estoqueAtual; // 3 meses de estoque
}
```

### 3. Adicionar Estoque ao Material
**Arquivo**: `pages/materiais/cadastro.tsx`

Adicionar funcionalidade:
- Botão "Adicionar Estoque" em cada material
- Modal para informar quantidade a adicionar
- Somar com estoque existente (não substituir)
- Registrar histórico de adições

### 4. Atualizar Estoque ao Aprovar Solicitação
**Arquivo**: `pages/api/materiais/solicitacoes/[id].ts`

Ao aprovar solicitação:
```typescript
// Para cada item da solicitação
for (const item of solicitacao.itens) {
  await prisma.materialEstoque.update({
    where: { id: item.materialId },
    data: {
      quantidadeEstoque: {
        decrement: item.quantidadeAprovada || item.quantidade
      }
    }
  });
}
```

### 5. Criar Histórico de Movimentação de Estoque
**Novo modelo no Prisma**:
```prisma
model HistoricoEstoque {
  id              String   @id @default(uuid())
  dataCriacao     DateTime @default(now())
  materialId      String
  material        MaterialEstoque @relation(fields: [materialId], references: [id])
  tipo            TipoMovimentacao // ENTRADA, SAIDA, AJUSTE
  quantidade      Int
  quantidadeAntes Int
  quantidadeDepois Int
  usuarioId       String
  usuario         Usuario @relation(fields: [usuarioId], references: [id])
  observacao      String?
  solicitacaoId   String? // Se foi por solicitação
  
  @@index([materialId])
  @@index([dataCriacao])
}

enum TipoMovimentacao {
  ENTRADA
  SAIDA
  AJUSTE
}
```

### 6. Melhorias no Relatório

**Estrutura do relatório completo**:
```typescript
interface RelatorioMateriais {
  resumo: {
    totalSolicitacoes: number;
    totalMateriais: number;
    totalSolicitantes: number;
    valorTotalGasto: number; // NOVO
  };
  
  materiaisMaisUsados: Array<{
    materialNome: string;
    quantidadeTotal: number;
    valorTotal: number; // NOVO
    numeroSolicitacoes: number;
    estoqueAtual: number; // NOVO
    sugestaoReposicao: number; // NOVO
  }>;
  
  totaisPorSolicitante: Array<{
    solicitanteNome: string;
    quantidadeSolicitacoes: number;
    quantidadeMateriaisDistintos: number;
    valorTotal: number; // NOVO
  }>;
  
  solicitacoesPorStatus: {
    pendentes: number;
    aprovadas: number;
    rejeitadas: number;
    entregues: number;
  };
  
  // NOVO: Detalhamento por material
  detalhamentoPorMaterial: Array<{
    materialNome: string;
    estoqueAtual: number;
    estoqueMinimo: number;
    consumoMedio: number;
    sugestaoReposicao: number;
    valorUnitario: number;
    valorTotalEstoque: number;
  }>;
}
```

### 7. Adicionar Filtros no Relatório
- Filtro por material específico
- Filtro por solicitante
- Filtro por status
- Filtro por aprovador

## 🔧 ARQUIVOS A MODIFICAR:

1. `prisma/schema.prisma` - Adicionar modelo HistoricoEstoque
2. `pages/api/materiais/solicitacoes/[id].ts` - Salvar aprovador e atualizar estoque
3. `pages/api/relatorios/materiais.ts` - Adicionar cálculos de valor e sugestão
4. `pages/materiais/relatorios.tsx` - Exibir novos dados
5. `pages/materiais/cadastro.tsx` - Adicionar funcionalidade de adicionar estoque
6. `pages/api/materiais/[id]/estoque.ts` - Nova rota para adicionar estoque

## 📊 EXEMPLO DE QUERY PARA RELATÓRIO COMPLETO:

```typescript
// Buscar materiais com consumo e estoque
const materiais = await prisma.materialEstoque.findMany({
  include: {
    itens: {
      include: {
        solicitacao: {
          where: {
            status: 'APROVADA',
            dataCriacao: {
              gte: dataInicio,
              lte: dataFim
            }
          },
          include: {
            aprovador: true
          }
        }
      }
    }
  }
});

// Calcular para cada material
const detalhamento = materiais.map(material => {
  const consumoTotal = material.itens.reduce((sum, item) => 
    sum + (item.quantidadeAprovada || item.quantidade), 0
  );
  
  const meses = differenceInMonths(dataFim, dataInicio) || 1;
  const consumoMedio = consumoTotal / meses;
  
  const sugestaoReposicao = material.quantidadeEstoque < (consumoMedio * 2)
    ? Math.ceil((consumoMedio * 3) - material.quantidadeEstoque)
    : 0;
  
  return {
    materialNome: material.nome,
    estoqueAtual: material.quantidadeEstoque,
    estoqueMinimo: material.estoqueMinimo,
    consumoMedio: Math.ceil(consumoMedio),
    sugestaoReposicao,
    valorUnitario: material.valor || 0,
    valorTotalEstoque: (material.valor || 0) * material.quantidadeEstoque,
    consumoTotal
  };
});
```

## 🎯 PRIORIDADE DE IMPLEMENTAÇÃO:

1. **ALTA**: Registrar aprovador e data de aprovação
2. **ALTA**: Atualizar estoque ao aprovar solicitação
3. **MÉDIA**: Adicionar funcionalidade de adicionar estoque
4. **MÉDIA**: Criar histórico de movimentação
5. **MÉDIA**: Melhorar relatórios com valores e sugestões
6. **BAIXA**: Adicionar filtros avançados no relatório
