# Guia de Responsividade - Controle de Carga

## 📱 Visão Geral

Este projeto foi atualizado para ser totalmente responsivo, oferecendo uma experiência otimizada em dispositivos móveis, tablets e desktops.

## 🎯 Componentes Responsivos Criados

### 1. ResponsiveTable
**Localização:** `components/ResponsiveTable.tsx`

Tabela que se adapta automaticamente ao tamanho da tela:
- **Desktop:** Tabela tradicional com colunas
- **Mobile:** Cards empilháveis com informações organizadas

```tsx
import ResponsiveTable from '../components/ResponsiveTable';

const columns = [
  { id: 'id', label: 'ID', minWidth: 100 },
  { id: 'nome', label: 'Nome', minWidth: 200, mobileLabel: 'Nome Completo' },
  { id: 'status', label: 'Status', hideOnMobile: true },
];

<ResponsiveTable
  columns={columns}
  rows={data}
  onRowClick={(row) => console.log(row)}
  actions={(row) => (
    <Button onClick={() => handleEdit(row)}>Editar</Button>
  )}
  emptyMessage="Nenhum item encontrado"
/>
```

### 2. ResponsiveContainer
**Localização:** `components/ResponsiveContainer.tsx`

Container adaptativo com breadcrumbs e títulos responsivos:

```tsx
import ResponsiveContainer from '../components/ResponsiveContainer';

<ResponsiveContainer
  title="Listar Controles"
  subtitle="Gerencie todos os controles de carga"
  breadcrumbs={[
    { label: 'Início', href: '/' },
    { label: 'Controles', href: '/controles' },
    { label: 'Listar' }
  ]}
  maxWidth="lg"
  showPaper={true}
>
  {/* Conteúdo da página */}
</ResponsiveContainer>
```

## 🎨 Tema Responsivo

### Breakpoints Customizados
```typescript
breakpoints: {
  xs: 0,     // Mobile
  sm: 600,   // Mobile grande
  md: 900,   // Tablet
  lg: 1200,  // Desktop
  xl: 1536,  // Desktop grande
}
```

### Tipografia Responsiva
Utiliza `clamp()` para escalonamento automático:
- **h1:** `clamp(2rem, 5vw, 3rem)`
- **h2:** `clamp(1.75rem, 4vw, 2.5rem)`
- **h3:** `clamp(1.5rem, 3.5vw, 2rem)`

### Botões Mobile-Friendly
- **Área mínima de toque:** 44px (desktop) / 48px (mobile)
- **Padding adaptativo:** Maior em dispositivos móveis
- **Hover desabilitado** em dispositivos touch

## 📐 Layout Responsivo

### Drawer Adaptativo
- **Desktop:** Drawer permanente com opção de recolher
- **Mobile:** SwipeableDrawer com overlay
- **Gesture:** Suporte a swipe para abrir/fechar

### Menu Mobile
- **Hamburger menu** no AppBar
- **Área de toque otimizada** (56px em mobile)
- **Transições suaves** entre estados

## 🛠️ Como Usar

### 1. Importar Hooks Necessários
```tsx
import { useTheme, useMediaQuery } from '@mui/material';

const theme = useTheme();
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
```

### 2. Aplicar Estilos Condicionais
```tsx
<Box sx={{
  padding: isMobile ? 1 : 3,
  fontSize: isMobile ? '0.875rem' : '1rem',
  '@media (max-width: 900px)': {
    flexDirection: 'column',
  }
}}>
```

### 3. Usar Componentes Responsivos
```tsx
// Ao invés de Table tradicional
<ResponsiveTable columns={columns} rows={data} />

// Ao invés de Container simples
<ResponsiveContainer title="Página">
  {content}
</ResponsiveContainer>
```

## 📋 Checklist para Novas Páginas

- [ ] Usar `ResponsiveContainer` como wrapper principal
- [ ] Substituir tabelas por `ResponsiveTable`
- [ ] Verificar área de toque dos botões (min 44px)
- [ ] Testar em diferentes tamanhos de tela
- [ ] Usar breakpoints do tema para estilos condicionais
- [ ] Verificar se textos são legíveis em mobile
- [ ] Testar navegação com gestos (swipe)

## 🔧 Utilitários Disponíveis

### Media Queries Pré-definidas
```tsx
const isMobile = useMediaQuery(theme.breakpoints.down('md'));
const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
```

### Espaçamentos Responsivos
```tsx
// Padding adaptativo
sx={{ p: { xs: 1, sm: 2, md: 3 } }}

// Margin responsiva
sx={{ m: { xs: '8px', md: '16px' } }}
```

## 🚀 Próximos Passos

1. **Aplicar em todas as páginas:** Migrar páginas existentes para usar os novos componentes
2. **Otimizar imagens:** Implementar imagens responsivas
3. **Testes:** Testar em dispositivos reais
4. **Performance:** Otimizar carregamento em mobile
5. **Acessibilidade:** Melhorar navegação por teclado

## 📱 Dispositivos Testados

- ✅ iPhone (375px - 414px)
- ✅ Android (360px - 412px)
- ✅ Tablet (768px - 1024px)
- ✅ Desktop (1200px+)

---

**Desenvolvido para oferecer a melhor experiência em todos os dispositivos! 🎯**
