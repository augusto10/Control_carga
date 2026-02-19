# Upload de Foto de Perfil - Guia de Uso

## Funcionalidade Implementada

A funcionalidade de upload de foto de perfil foi completamente implementada com os seguintes componentes:

### Backend
- **Endpoint de Upload**: `POST /api/usuarios/upload-foto`
- **Autenticação**: Requer token JWT via cookies
- **Validações**: 
  - Apenas imagens (JPEG, JPG, PNG, GIF, WebP)
  - Tamanho máximo: 5MB
  - Diretório de armazenamento: `public/uploads/avatars/`

### Frontend
- **Página de Perfil**: `/admin/perfil`
- **Preview da foto antes do upload**
- **Exibição de avatar com inicial se não houver foto**
- **Feedback visual durante o upload**

### Banco de Dados
- **Campo adicionado**: `foto` (String, opcional) no modelo `Usuario`
- **Migração**: Prisma sincronizado com o banco

## Como Usar

### Para Usuários
1. Acesse a página de perfil (`/admin/perfil`)
2. Clique no botão de câmera sobre o avatar
3. Selecione uma imagem de até 5MB
4. A foto será automaticamente atualizada após o upload

### Para Desenvolvedores

#### Upload de Foto
```javascript
const formData = new FormData();
formData.append('foto', file);

const response = await fetch('/api/usuarios/upload-foto', {
  method: 'POST',
  body: formData,
  credentials: 'include',
});
```

#### Atualizar Contexto
```javascript
import { useAuth } from '../contexts/AuthContext';

const { updateUser } = useAuth();
updateUser({ foto: '/uploads/avatars/nome-do-arquivo.jpg' });
```

## Configuração de Produção

### Variáveis de Ambiente Necessárias
- `JWT_SECRET`: Chave secreta para JWT
- `NEXT_PUBLIC_APP_URL`: URL da aplicação (para CORS)

### Armazenamento em Produção
Para produção em Vercel ou ambientes serverless, considere:
- **Amazon S3** ou **Cloudinary** para armazenamento persistente
- **CDN** para distribuição de imagens
- **Otimização automática** de imagens

### Migração para Produção
```bash
# Gerar cliente Prisma
npx prisma generate

# Aplicar migrações
npx prisma db push

# Verificar variáveis de ambiente
npm run check-env
```

## Testes

### Teste Local
1. Execute o servidor: `npm run dev`
2. Acesse: `http://localhost:3000/admin/perfil`
3. Faça login e teste o upload

### Script de Teste
```bash
# Verificar estrutura de uploads
node test-upload-foto.js
```

## Segurança
- **Autenticação obrigatória** para upload
- **Validação de tipo e tamanho** de arquivo
- **Sanitização de nomes de arquivo**
- **Diretório protegido** (não acessível diretamente)

## Próximos Passos
- [ ] Implementar armazenamento em nuvem (S3/Cloudinary)
- [ ] Adicionar recorte de imagem antes do upload
- [ ] Implementar cache de imagens
- [ ] Adicionar fallback para imagem padrão
- [ ] Otimizar imagens automaticamente
