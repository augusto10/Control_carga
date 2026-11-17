# Rollout — Direcionamento de notas por transportadora

## Antes da migração

1. Faça backup/snapshot do banco e teste o procedimento em staging.
2. Confirme no PostgreSQL os nomes físicos `"NotaFiscal"`, `"codigo"`, `"numeroNota"`, `"controleId"` e o tipo enum `"Transportadora"`.
3. Execute a consulta de duplicidades abaixo. Ela é somente leitura e usa a mesma preferência de identidade da aplicação: código válido primeiro; número normalizado para códigos manuais ou inválidos.
4. Investigue as duplicidades antes de qualquer proposta futura de restrição única. Esta entrega não cria uma constraint de unicidade.

```sql
WITH identidades AS (
  SELECT
    "id",
    CASE
      WHEN BTRIM("codigo") ~* '^[A-Z0-9-]{1,50}$'
        AND UPPER(BTRIM("codigo")) NOT LIKE 'MANUAL-%'
      THEN 'codigo:' || UPPER(BTRIM("codigo"))
      ELSE 'numero:' || COALESCE(
        NULLIF(
          LTRIM(REGEXP_REPLACE(BTRIM("numeroNota"), '[^0-9]', '', 'g'), '0'),
          ''
        ),
        '0'
      )
    END AS identidade
  FROM "NotaFiscal"
  WHERE (
    BTRIM("codigo") ~* '^[A-Z0-9-]{1,50}$'
    AND UPPER(BTRIM("codigo")) NOT LIKE 'MANUAL-%'
  ) OR REGEXP_REPLACE(BTRIM("numeroNota"), '[^0-9]', '', 'g') <> ''
)
SELECT identidade, COUNT(*) AS quantidade, ARRAY_AGG("id" ORDER BY "id") AS nota_ids
FROM identidades
GROUP BY identidade
HAVING COUNT(*) > 1
ORDER BY quantidade DESC, identidade;
```

## Migração e publicação

1. Aplique a migration `20261113120000_add_nota_transportadora_destino` em staging e confirme que ela somente adicionou a coluna opcional e o índice composto.
2. Aplique a mesma migration em produção. Ela não faz backfill nem altera valores de notas existentes.
3. Publique o backend compatível: aceita o payload antigo de salvamento, valida destinos presentes, autentica mutações e aplica transferência/vínculo em transações. A compatibilidade permite que clientes antigos vinculem notas ainda sem destino, sem preenchê-lo; a interface nova exige direcionar essas notas antes do vínculo.
4. Publique **Adicionar notas** com aviso de duplicidade e destino por nota.
5. Publique **Criar controle** com filas por destino, seleção explícita, transferência confirmada e criação atômica.
6. Valide login, consulta, cadastro legado e novo, transferência, criação com e sem notas e edição de controles em staging antes da liberação geral.

## Distribuição histórica

Execute após a migration. A consulta é somente leitura; notas vinculadas permanecem no bucket histórico e nunca são reclassificadas pela aplicação.

```sql
SELECT
  CASE
    WHEN "controleId" IS NOT NULL THEN 'vinculada_historica'
    WHEN "transportadoraDestino" IS NULL THEN 'sem_transportadora'
    ELSE 'disponivel_direcionada'
  END AS situacao,
  COALESCE("transportadoraDestino"::text, 'SEM_TRANSPORTADORA') AS destino,
  COUNT(*) AS quantidade
FROM "NotaFiscal"
GROUP BY situacao, destino
ORDER BY situacao, destino;
```

## Monitoramento e rollback

- Acompanhe as respostas `409` de duplicidade (`duplicate_note`), transferência/vínculo (`notes_unavailable`) e criação de controle (`notes_unavailable`).
- Acompanhe respostas `401`/`403` nas mutações e erros `500` de `/api/notas`, `/api/notas/transferir`, `/api/controles` e `/api/controles/[id]`.
- Somente `ADMIN` pode excluir controles, inclusive finalizados. Confira a preservação e desvinculação das notas e pedidos, a remoção dos itens de associação de frete e a manutenção do registro de pagamento. Conflitos concorrentes de exclusão retornam `409`.
- Confira a edição de motorista e seleção de notas antes da finalização e a restrição de edição a `ADMIN` depois dela. O PDF só pode ser visualizado após finalizar.
- Confira que a exclusão atualiza a lista local sem consultar todo o histórico. A listagem usa 50 registros por padrão e aceita limites entre 1 e 200.
- Repita a consulta de distribuição para observar o volume de notas sem transportadora; não use os resultados para preencher dados automaticamente.
- Se houver regressão, reverta a aplicação para a versão compatível anterior. **Não remova a coluna nem o índice durante rollback**; os dados continuam intactos e versões antigas ignoram o campo.
- Não execute SQL de `UPDATE`, `DELETE` ou backfill como parte deste rollout.
