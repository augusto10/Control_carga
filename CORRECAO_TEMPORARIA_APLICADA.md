# CORREÇÃO TEMPORÁRIA APLICADA

## Status: ATIVO

As seguintes APIs foram substituídas por versões temporárias compatíveis com o schema antigo do banco de produção:

### APIs Corrigidas:
- `/api/motoristas` → Versão compatível sem campo `tipo`
- `/api/notas` → Versão compatível com enum antigo

### Problemas Resolvidos:
1. **Erro P2022**: Campo `Motorista.tipo` não existe
2. **Erro enum**: Valor 'ACERT' não encontrado no enum 'Transportadora'

### Backups Criados:
- `pages/api/motoristas/index.original.ts`
- `pages/api/notas/index.original.ts`

### Para Reverter:
```bash
npm run reverter-correcao-temporaria
```

### Para Aplicar Migração Definitiva:
```bash
npm run migration-producao
```

---
**Data de Aplicação**: 2025-10-02T20:59:23.647Z
**Ambiente**: Produção (Vercel)
