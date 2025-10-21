# ✅ Correção: Upload de Foto do Perfil

## 🔥 Problema Identificado

O upload de foto estava usando **multer** para salvar arquivos no sistema de arquivos local, o que **não funciona em ambientes serverless** como Vercel:

❌ **Problemas com a abordagem anterior:**
- Sistema de arquivos efêmero no Vercel
- Uploads perdidos após cada deploy
- Diretório `public/uploads/avatars/` não persiste
- Multer não é compatível com serverless

## ✅ Solução Implementada

### **Armazenamento Base64 no Banco de Dados**

A foto agora é convertida para **base64** e salva diretamente no campo `foto` do modelo `Usuario` no banco de dados PostgreSQL.

### **Vantagens:**
- ✅ **Funciona em qualquer ambiente** (local, serverless, produção)
- ✅ **Persistência garantida** (dados no banco)
- ✅ **Sem dependência de sistema de arquivos**
- ✅ **Compatível com Vercel/Netlify**
- ✅ **Backup automático** junto com dados do usuário

## 📁 Arquivos Criados/Modificados

### **1. Nova API (Base64)**
**Arquivo:** `pages/api/usuarios/upload-foto-base64.ts`
- Aceita imagens em formato base64
- Valida tamanho (máximo 5MB)
- Valida formato (data:image/*)
- Salva diretamente no banco
- Autenticação via JWT

### **2. Frontend Atualizado**
**Arquivos:**
- `pages/perfil/index.tsx` 
- `pages/admin/perfil.tsx`

**Alterações:**
- `handlePhotoUpload`: Converte arquivo para base64 antes do upload
- `handleCameraImage`: Envia base64 diretamente da câmera
- Remove dependência de FormData
- Remove header `multipart/form-data`

## 🚀 Como Funciona

### **Fluxo de Upload:**

```javascript
// 1. Usuário seleciona arquivo ou tira foto
const file = event.target.files?.[0];

// 2. Converter para base64
const reader = new FileReader();
reader.onload = async (e) => {
  const fotoBase64 = e.target?.result as string;
  
  // 3. Enviar para API
  const response = await api.post('/api/usuarios/upload-foto-base64', {
    fotoBase64
  });
  
  // 4. Atualizar contexto
  updateUser({ ...user, foto: response.data.fotoUrl });
};
reader.readAsDataURL(file);
```

### **Validações:**

✅ **Frontend:**
- Tipo de arquivo (apenas imagens)
- Tamanho máximo: 5MB

✅ **Backend:**
- Formato base64 válido
- Prefixo `data:image/`
- Tamanho máximo: ~7MB (base64 é ~33% maior)
- Autenticação JWT obrigatória

## 📊 Estrutura do Banco

```prisma
model Usuario {
  id    String  @id @default(uuid())
  nome  String
  email String  @unique
  foto  String? // ← Armazena base64 completo
  // ... outros campos
}
```

**Tipo no PostgreSQL:** `TEXT` (suporta strings grandes)

## 🧪 Testando

### **1. Upload de Arquivo:**
1. Acesse `/perfil` ou `/admin/perfil`
2. Clique em "Anexar do dispositivo"
3. Selecione uma imagem (máx 5MB)
4. Aguarde upload automático

### **2. Captura de Câmera:**
1. Acesse `/perfil` ou `/admin/perfil`
2. Clique em "Tirar foto agora"
3. Permita acesso à câmera
4. Capture a foto
5. Upload automático

### **3. Visualização:**
```jsx
<Avatar
  src={user?.foto || undefined}
  sx={{ width: 120, height: 120 }}
>
  {!user?.foto && usuario.nome?.charAt(0).toUpperCase()}
</Avatar>
```

## 🔒 Segurança

- ✅ Autenticação JWT obrigatória
- ✅ Validação de tipo de arquivo
- ✅ Limite de tamanho (5MB)
- ✅ Sanitização de dados
- ✅ CORS configurado

## 📝 Migração de Dados

### **Fotos Antigas (Arquivos):**

Se houver fotos antigas no formato `/uploads/avatars/nome.jpg`, você pode convertê-las para base64:

```javascript
// Script de migração (opcional)
const fs = require('fs');
const path = require('path');

// Ler arquivo
const fotoPath = './public/uploads/avatars/foto.jpg';
const buffer = fs.readFileSync(fotoPath);
const base64 = buffer.toString('base64');
const mimeType = 'image/jpeg';
const fotoBase64 = `data:${mimeType};base64,${base64}`;

// Atualizar no banco
await prisma.usuario.update({
  where: { id: usuarioId },
  data: { foto: fotoBase64 }
});
```

## 🌐 Produção

### **Vercel:**
- ✅ Funciona nativamente
- ✅ Sem configuração adicional
- ✅ Sem necessidade de armazenamento externo

### **Variáveis de Ambiente:**
```env
DATABASE_URL=postgresql://...
JWT_SECRET=sua_chave_secreta
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

## 🎯 Performance

### **Base64 vs Arquivo:**
- **Base64:** ~33% maior que arquivo original
- **Carregamento:** Direto do banco (sem request adicional)
- **Cache:** Navegador cacheia base64 normalmente
- **Limite prático:** 5MB original = ~6.7MB base64

### **Otimizações Futuras (Opcional):**
- [ ] Compressão de imagem antes do upload
- [ ] Redimensionamento automático (ex: 400x400px)
- [ ] Lazy loading de avatares
- [ ] CDN para imagens (se necessário)

## 📌 Notas

- ✅ **API antiga mantida:** `/api/usuarios/upload-foto` ainda existe (compatibilidade)
- ✅ **Nova API preferida:** `/api/usuarios/upload-foto-base64` (produção)
- ✅ **Ambas funcionam:** Use base64 para novos uploads

## 🆘 Troubleshooting

### **Erro: "Imagem muito grande"**
- Reduza o tamanho da imagem para menos de 5MB
- Use ferramentas de compressão de imagem

### **Erro: "Formato inválido"**
- Certifique-se de usar apenas imagens (JPEG, PNG, WebP, GIF)
- Verifique se o arquivo não está corrompido

### **Erro: "Não autorizado"**
- Faça login novamente
- Verifique se o token JWT está válido

### **Foto não aparece:**
- Verifique se `user.foto` contém o base64 completo
- Verifique console do navegador por erros
- Verifique se o campo `foto` foi atualizado no banco

---

**Status:** ✅ **PROBLEMA RESOLVIDO** - Upload funcionando em todos os ambientes
