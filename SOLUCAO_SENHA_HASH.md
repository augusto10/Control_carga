# Solução para Problema de Hash de Senha

## Problema
Usuário reporta que "essa senha hash nao aceita pra logar". Isso pode ocorrer quando:
1. O hash da senha no banco de dados está corrompido
2. A senha que o usuário está tentando não corresponde ao hash armazenado
3. Há um problema no algoritmo de hash/verificação

## Soluções Disponíveis

### 1. Script Interativo para Corrigir Senha
Use o script `corrigir-senha-usuario.js` para:
- Buscar um usuário pelo email
- Testar se uma senha corresponde ao hash atual
- Alterar a senha se necessário

**Como usar:**
```bash
node corrigir-senha-usuario.js
```

O script irá:
1. Solicitar o email do usuário
2. Buscar o usuário no banco de dados
3. Mostrar informações do usuário (incluindo parte do hash)
4. Permitir testar a senha atual
5. Permitir alterar para uma nova senha

### 2. Scripts Específicos para Admin

**Para o usuário admin padrão:**
```bash
# Atualizar senha do admin para "admin123"
node scripts/update-admin-password.js

# Corrigir hash do admin
node scripts/fix-hash.js
```

**Para criar um novo admin:**
```bash
node scripts/create-admin.js
```

### 3. API de Reset de Senha (para administradores)
Se você está logado como administrador, pode usar a API:
```
POST /api/admin/usuarios/[id]/reset-password
```
Esta API gera uma nova senha aleatória e retorna na resposta (apenas para desenvolvimento).

## Diagnóstico do Problema

### Passo 1: Verificar se o hash está correto
```bash
node testar-senha-atual.js
```
Este script testa várias senhas comuns contra o hash do usuário admin.

### Passo 2: Listar todos os usuários
```bash
node listar-usuarios.js
```
Mostra todos os usuários do sistema para identificar qual está com problema.

### Passo 3: Buscar senha de um usuário específico
```bash
node buscar-senha-usuario-simples.js
```
Busca um usuário pelo email e mostra o hash da senha.

## Cenários Comuns e Soluções

### Cenário 1: Senha do Admin não funciona
1. Execute `node testar-senha-atual.js` para verificar se "admin123" funciona
2. Se não funcionar, execute `node scripts/fix-hash.js`
3. Tente fazer login com:
   - Email: `admin@esplendor.com`
   - Senha: `admin123`

### Cenário 2: Usuário comum não consegue fazer login
1. Use `node corrigir-senha-usuario.js`
2. Digite o email do usuário
3. Teste a senha atual
4. Se não funcionar, altere para uma nova senha

### Cenário 3: Hash corrompido
Se o hash estiver corrompido (não é um hash bcrypt válido):
1. Use `node corrigir-senha-usuario.js`
2. Digite o email do usuário
3. Pule o teste de senha atual (pressione Enter)
4. Defina uma nova senha

## Scripts Disponíveis

| Script | Função |
|--------|--------|
| `corrigir-senha-usuario.js` | Script interativo para corrigir senha de qualquer usuário |
| `scripts/update-admin-password.js` | Atualiza senha do admin para "admin123" |
| `scripts/fix-hash.js` | Corrige hash do admin |
| `scripts/create-admin.js` | Cria novo usuário admin |
| `testar-senha-atual.js` | Testa senhas comuns contra hash do admin |
| `listar-usuarios.js` | Lista todos os usuários do sistema |
| `buscar-senha-usuario-simples.js` | Busca usuário e mostra hash da senha |

## Dicas de Segurança

1. **Em produção**: Remova a exibição da nova senha na resposta da API
2. **Sempre use**: Senhas fortes (mínimo 8 caracteres, mistura de letras, números e símbolos)
3. **Considere**: Implementar recuperação de senha por email em produção
4. **Mantenha**: O arquivo `.env.local` seguro, pois contém a `DATABASE_URL`

## Troubleshooting

### Erro: "Environment variable not found: DATABASE_URL"
Certifique-se de que o arquivo `.env.local` existe e contém a variável `DATABASE_URL`.

### Erro: "PrismaClientInitializationError"
Verifique se a conexão com o banco de dados está funcionando e se a `DATABASE_URL` está correta.

### Erro: "Usuário não encontrado"
Verifique se o email digitado está correto usando `node listar-usuarios.js`.

## Contato
Se os problemas persistirem, verifique os logs do servidor e consulte a documentação do sistema.