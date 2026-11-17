# Direcionamento de Notas por Transportadora Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Direcionar notas disponíveis por transportadora, permitir transferência antes do vínculo e criar controles de forma atômica sem alterar notas e controles históricos.

**Architecture:** A mudança de banco é aditiva: uma coluna enum opcional e um índice de fila, sem backfill. As APIs validam entrada, autenticação, concorrência e compatibilidade; as duas telas passam a consumir essas regras sem mudar o significado dos registros antigos.

**Tech Stack:** Next.js Pages Router, React 18, TypeScript, Material UI, Zustand, Prisma 6, PostgreSQL, Zod.

**Spec:** `docs/superpowers/specs/2026-11-13-direcionamento-notas-transportadora-design.md`

## Global Constraints

- Não apagar, reclassificar nem preencher em massa notas históricas.
- `transportadoraDestino` permanece opcional durante a implantação gradual.
- Nota vinculada a controle não pode ser transferida.
- Controle aberto pode ser editado por usuário autenticado; controle finalizado somente por `ADMIN`.
- Criar controle sem notas continua permitido.
- Endpoints antigos continuam aceitos enquanto a interface e o backend são publicados por etapas.

## Review Focus

- Duas requisições concorrentes não podem vincular a mesma nota a controles diferentes.
- Uma duplicidade detectada após a leitura deve retornar `409` sem criar registro.
- Nota antiga sem destino deve aparecer apenas em **Sem transportadora** e nunca ser alterada automaticamente.
- Trocar a transportadora do formulário deve limpar a seleção anterior.
- Payload legado sem `transportadoraDestino` deve continuar funcionando.

---

### Task 1: Modelo aditivo e regras compartilhadas

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261113120000_add_nota_transportadora_destino/migration.sql`
- Create: `lib/notas/transportadora.ts`
- Create: `lib/auth/permissions.ts`
- Test: `tests/nota-transportadora-rules.test.ts`

**Interfaces:**
- Produces: `normalizeNotaIdentity`, `isTransportadora`, `canEditControle` e o campo Prisma `NotaFiscal.transportadoraDestino`.

- [ ] Escrever testes falhando para normalização, enum e permissão de controle finalizado.
- [ ] Executar `npx ts-node -r tsconfig-paths/register tests/nota-transportadora-rules.test.ts` e confirmar falha.
- [ ] Implementar helpers, coluna opcional e índice composto `transportadoraDestino, controleId`.
- [ ] Executar o teste e `npx prisma validate`; ambos devem passar.

### Task 2: Cadastro e aviso de nota já salva

**Files:**
- Modify: `pages/api/notas/index.ts`
- Modify: `pages/api/notas/salvar-multiplas.ts`
- Modify: `components/AdicionarNotasContent.tsx`
- Test: `tests/nota-cadastro-contract.test.ts`

**Interfaces:**
- Consumes: helpers e campo da Task 1.
- Produces: consulta exata de existência e salvamento com `transportadoraDestino`, erro `409 duplicate_note` e mensagem **Esta nota já está salva**.

- [ ] Escrever testes falhando para payload novo, payload legado, duplicidade no lote e resposta `409`.
- [ ] Executar o teste e confirmar falha.
- [ ] Validar query/body com Zod, autenticar mutações e manter resposta legada compatível.
- [ ] Fazer a tela verificar a nota persistida após leitura/digitação, selecionar destino padrão por lote e permitir ajuste individual.
- [ ] Executar o teste e `npx tsc --noEmit`; ambos devem passar.

### Task 3: Filtragem e transferência de notas disponíveis

**Files:**
- Modify: `pages/api/notas/index.ts`
- Create: `pages/api/notas/transferir.ts`
- Modify: `store/store.ts`
- Test: `tests/nota-transferencia-contract.test.ts`

**Interfaces:**
- Consumes: `isTransportadora` e `NotaFiscal.transportadoraDestino`.
- Produces: filtros `disponiveis`, `transportadoraDestino`, `semTransportadora` e `transferirNotas(notaIds, destino)`.

- [ ] Escrever testes falhando para filtros, IDs repetidos, destino inválido e conflito de nota vinculada.
- [ ] Executar o teste e confirmar falha.
- [ ] Implementar consulta filtrada e transferência transacional autenticada que atualiza somente `controleId = null`.
- [ ] Atualizar tipos e ações da store sem remover assinaturas existentes.
- [ ] Executar o teste e `npx tsc --noEmit`; ambos devem passar.

### Task 4: Criação atômica e autorização de controles

**Files:**
- Modify: `pages/api/controles/index.ts`
- Modify: `pages/api/controles/[id].ts`
- Modify: `pages/api/controles/vincular-notas.ts`
- Modify: `store/store.ts`
- Test: `tests/controle-notas-contract.test.ts`

**Interfaces:**
- Consumes: `canEditControle`, enum e campo de destino.
- Produces: criação transacional que valida disponibilidade/destino e endpoint de edição protegido.

- [ ] Escrever testes falhando para controle vazio, destino divergente, corrida de vínculo e edição por perfil/status.
- [ ] Executar o teste e confirmar falha.
- [ ] Implementar autenticação, Zod e transação serializável na criação; vincular notas somente após validar todas.
- [ ] Remover da store a segunda chamada redundante a `/api/controles/vincular-notas` e preservar o método público legado.
- [ ] Proteger `PUT`: aberto para autenticado, finalizado somente `ADMIN`; não reclassificar notas históricas.
- [ ] Executar o teste e `npx tsc --noEmit`; ambos devem passar.

### Task 5: Experiência de criação e transferência

**Files:**
- Modify: `components/CriarControleContent.tsx`
- Modify: `components/ListarControlesContent.tsx`
- Test: `tests/criar-controle-notas-view.test.ts`

**Interfaces:**
- Consumes: filtros e `transferirNotas` da Task 3 e criação atômica da Task 4.

- [ ] Escrever teste falhando para filtragem por destino, limpeza da seleção e remoção das transferidas.
- [ ] Executar o teste e confirmar falha.
- [ ] Exibir somente notas disponíveis da transportadora escolhida, com contagem, seleção e estado vazio.
- [ ] Adicionar transferência confirmada para outra transportadora e recarregar filas após sucesso.
- [ ] Alinhar a visibilidade de edição ao servidor: finalizado somente `ADMIN`.
- [ ] Executar o teste, `npx tsc --noEmit` e `npm run build`; todos devem passar.

### Task 6: Verificação de implantação segura

**Files:**
- Modify: `docs/superpowers/specs/2026-11-13-direcionamento-notas-transportadora-design.md`
- Create: `docs/superpowers/plans/2026-11-13-direcionamento-notas-transportadora-rollout.md`

**Interfaces:**
- Consumes: todas as entregas anteriores.
- Produces: checklist de auditoria, migração, deploy, métricas e rollback.

- [ ] Registrar SQL somente leitura para contagem de duplicidades e distribuição de notas históricas.
- [ ] Registrar ordem de deploy: migração aditiva, backend compatível e interface.
- [ ] Executar todos os testes direcionados, `npx prisma validate`, `npx tsc --noEmit` e `npm run build`.
- [ ] Revisar o diff para confirmar ausência de `DELETE`, backfill e alteração de notas vinculadas.
