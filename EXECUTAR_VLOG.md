# 🚀 Executar Script para Adicionar VLOG em Produção

## 📋 Resumo

Script TypeScript que adiciona a transportadora **VLOG** ao banco de dados de produção de forma segura.

## ✅ Segurança

- ✅ Verifica se VLOG já existe antes de adicionar
- ✅ Não deleta dados existentes
- ✅ Idempotente (seguro executar múltiplas vezes)
- ✅ Mostra relatório completo após execução

## 🔧 Como Executar

### Opção 1: Localmente (Desenvolvimento)

```bash
# 1. Trocar DATABASE_URL no .env para apontar para produção
# DATABASE_URL=postgresql://user:password@host:port/database_production

# 2. Executar o script
npx ts-node scripts/adicionar-vlog-producao.ts

# 3. Voltar DATABASE_URL para desenvolvimento
```

### Opção 2: Via Vercel (Recomendado)

```bash
# 1. Fazer pull das variáveis de produção
vercel env pull .env.production.local

# 2. Executar com variáveis de produção
DATABASE_URL=$(cat .env.production.local | grep DATABASE_URL | cut -d '=' -f2) npx ts-node scripts/adicionar-vlog-producao.ts

# Ou no PowerShell:
$env:DATABASE_URL = (Get-Content .env.production.local | Select-String "DATABASE_URL" | ForEach-Object { $_.Line.Split('=')[1] })
npx ts-node scripts/adicionar-vlog-producao.ts
```

### Opção 3: Via Node.js Compilado

```bash
# 1. Compilar TypeScript
npx tsc scripts/adicionar-vlog-producao.ts --outDir dist --module commonjs --target es2020

# 2. Executar
DATABASE_URL=postgresql://... node dist/scripts/adicionar-vlog-producao.js
```

## 📊 Resultado Esperado

```
🚀 [VLOG] Iniciando adição de VLOG ao banco de produção...
✅ [VLOG] Conexão com banco estabelecida
🔄 [VLOG] Adicionando VLOG ao enum Transportadora...
✅ [VLOG] VLOG adicionado ao enum com sucesso!
🔍 [VLOG] Verificando valores atuais do enum Transportadora...
📊 [VLOG] Transportadoras disponíveis:
  - ACERT
  - ACCERT
  - EXPRESSO_GOIAS
  - TERCEIRIZADA
  - DETAFRA_TRANSPORTES
  - RETIRA_VENDEDOR
  - RETIRA_CLIENTE
  - VLOG
📊 [VLOG] Controles por transportadora:
  - TERCEIRIZADA: 45 controle(s)
  - ACCERT: 32 controle(s)
  - EXPRESSO_GOIAS: 18 controle(s)
  - VLOG: 0 controle(s)
🎉 [VLOG] VLOG adicionado com sucesso ao banco de produção!
✨ A transportadora VLOG agora está disponível para uso
✅ Script concluído com sucesso
```

## ✨ Próximos Passos

Após executar o script:

1. ✅ Redeploy no Vercel (para atualizar cache)
2. ✅ Teste criando um novo controle com transportadora VLOG
3. ✅ Verifique se VLOG aparece na listagem de transportadoras

## 🔍 Verificação Manual

Para verificar se VLOG foi adicionado corretamente:

```bash
# Via psql
psql "postgresql://user:password@host:port/database" -c "
  SELECT enumlabel as transportadora 
  FROM pg_enum 
  WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Transportadora')
  ORDER BY enumsortorder
"
```

## ⚠️ Troubleshooting

**Erro: "DATABASE_URL não configurada"**
- Certifique-se de que o .env tem DATABASE_URL
- Ou use `vercel env pull` para puxar variáveis de produção

**Erro: "Conexão recusada"**
- Verifique se a URL do banco está correta
- Verifique se o IP está na whitelist do banco

**VLOG não aparece na interface**
- Redeploy o Vercel após executar o script
- Limpe o cache do navegador (Ctrl+Shift+Delete)
