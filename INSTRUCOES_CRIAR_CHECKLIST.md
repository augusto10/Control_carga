# Instruções para Criar Tabela ChecklistRecebimento

Se os scripts automáticos não funcionarem devido a permissões, siga estas instruções para criar a tabela manualmente:

1. Conecte ao banco de dados usando psql como superusuário (ou usuário com permissões de criar tipos e tabelas)

2. Execute o script SQL completo:
   ```bash
   psql -U postgres -d sua_database -f sql/create_checklist_recebimento_all.sql
   ```

   Substitua:
   - `postgres` pelo usuário superusuário do seu banco
   - `sua_database` pelo nome do seu banco de dados

3. Depois que a tabela for criada, atualize o Prisma:
   ```bash
   npx prisma generate
   ```

4. Verifique se a tabela foi criada corretamente:
   ```sql
   \d "ChecklistRecebimento"
   ```

Se precisar reverter:
```sql
DROP TABLE IF EXISTS "ChecklistRecebimento";
DROP TYPE IF EXISTS "CondicaoEmbalagem";
```

## Problemas Comuns

1. Erro "permission denied for schema public":
   - Execute o script como superusuário (postgres)
   - Ou conceda as permissões necessárias ao seu usuário:
     ```sql
     GRANT ALL ON SCHEMA public TO seu_usuario;
     ALTER USER seu_usuario CREATEDB;
     ```

2. Erro "type "CondicaoEmbalagem" already exists":
   - O script já trata isso, mas se precisar, remova manualmente:
     ```sql
     DROP TYPE IF EXISTS "CondicaoEmbalagem" CASCADE;
     ```

3. Erro com a foreign key do Usuario:
   - Verifique se a tabela Usuario existe:
     ```sql
     \d "Usuario"
     ```
   - Se não existir, crie-a primeiro

## Verificação

Depois de criar a tabela, você pode verificar a estrutura:

```sql
\d "ChecklistRecebimento"
```

E verificar se os índices foram criados:

```sql
\di checklist_recebimento_*
```