# 📦 Sistema de Controle de Materiais

## 🎯 Visão Geral

Sistema completo para controle de materiais de uso interno (fitas, stretch, resmas de papel, etc.) com fluxo de solicitação e aprovação.

## 🔄 Fluxo do Sistema

### 1. **Cadastro de Materiais** (Gerente/Admin)
- Gerentes cadastram os materiais disponíveis
- Definem estoque inicial e estoque mínimo
- Gerenciam unidades de medida (UN, CX, PCT, RL, KG, L, M)
- Ativam/desativam materiais

### 2. **Solicitação** (Funcionários)
- Funcionários solicitam materiais necessários
- Podem adicionar múltiplos itens em uma solicitação
- Informam quantidade e observações
- Acompanham status das solicitações

### 3. **Aprovação** (Gerente/Admin)
- Gerentes visualizam solicitações pendentes
- Verificam disponibilidade em estoque
- Podem ajustar quantidades aprovadas
- Aprovam ou rejeitam com motivo
- Estoque é deduzido automaticamente na aprovação

### 4. **Relatórios** (Gerente/Admin)
- Consumo por material
- Consumo por funcionário
- Filtros por período
- Exportação para CSV

## 📊 Estrutura do Banco de Dados

### **MaterialEstoque**
```
- id (UUID)
- nome (String)
- descricao (String?)
- unidadeMedida (String) - UN, CX, PCT, RL, KG, L, M
- quantidadeEstoque (Int)
- estoqueMinimo (Int)
- ativo (Boolean)
- dataCriacao (DateTime)
- dataAtualizacao (DateTime)
```

### **SolicitacaoMaterial**
```
- id (UUID)
- solicitanteId (String) → Usuario
- status (StatusSolicitacao) - PENDENTE, APROVADA, REJEITADA, ENTREGUE
- observacao (String?)
- dataAprovacao (DateTime?)
- aprovadorId (String?) → Usuario
- motivoRejeicao (String?)
- dataCriacao (DateTime)
- dataAtualizacao (DateTime)
```

### **ItemSolicitacaoMaterial**
```
- id (UUID)
- solicitacaoId (String) → SolicitacaoMaterial
- materialId (String) → MaterialEstoque
- quantidade (Int)
- quantidadeAprovada (Int?)
- observacao (String?)
```

## 🔐 Permissões

### **ADMIN / GERENTE**
- ✅ Cadastrar materiais
- ✅ Editar materiais
- ✅ Ativar/desativar materiais
- ✅ Aprovar solicitações
- ✅ Rejeitar solicitações
- ✅ Visualizar relatórios
- ✅ Solicitar materiais

### **FUNCIONARIO / SEPARADOR / CONFERENTE / AUDITOR**
- ✅ Solicitar materiais
- ✅ Visualizar suas solicitações
- ❌ Não pode aprovar
- ❌ Não pode cadastrar materiais
- ❌ Não pode ver relatórios

## 📱 Páginas do Sistema

### 1. `/materiais/cadastro` (Admin/Gerente)
**Funcionalidades:**
- Listar todos os materiais
- Adicionar novo material
- Editar material existente
- Ativar/desativar material
- Excluir material (se não houver solicitações)
- Alerta de estoque baixo

**Campos do Formulário:**
- Nome *
- Descrição
- Unidade de Medida *
- Estoque Atual
- Estoque Mínimo

### 2. `/materiais/solicitar` (Todos)
**Funcionalidades:**
- Adicionar itens à solicitação
- Informar quantidade e observação por item
- Enviar solicitação
- Visualizar histórico de solicitações
- Ver status (Pendente/Aprovada/Rejeitada)

**Informações Exibidas:**
- Material disponível com estoque atual
- Quantidade solicitada
- Status da solicitação
- Data de aprovação
- Aprovador
- Motivo de rejeição (se aplicável)

### 3. `/materiais/aprovar` (Admin/Gerente)
**Funcionalidades:**
- Listar solicitações pendentes
- Ver detalhes do solicitante
- Verificar estoque disponível
- Ajustar quantidades aprovadas
- Aprovar solicitação
- Rejeitar com motivo

**Validações:**
- Verifica estoque disponível
- Alerta de estoque insuficiente
- Impede aprovação sem estoque

### 4. `/materiais/relatorios` (Admin/Gerente)
**Funcionalidades:**
- Filtrar por período
- Resumo geral (total solicitações, materiais, solicitantes)
- Consumo por material (ordenado por quantidade)
- Consumo por funcionário (ordenado por solicitações)
- Exportar para CSV

**Dados do Relatório:**
- Total de solicitações aprovadas
- Materiais mais consumidos
- Funcionários que mais solicitam
- Quantidade total por material
- Número de solicitações por material

## 🔌 APIs Disponíveis

### **Materiais**
- `GET /api/materiais` - Listar materiais
- `POST /api/materiais` - Criar material (Admin/Gerente)
- `GET /api/materiais/[id]` - Buscar material
- `PUT /api/materiais/[id]` - Atualizar material (Admin/Gerente)
- `DELETE /api/materiais/[id]` - Excluir material (Admin/Gerente)

### **Solicitações**
- `GET /api/solicitacoes-material` - Listar solicitações
- `POST /api/solicitacoes-material` - Criar solicitação
- `POST /api/solicitacoes-material/[id]/aprovar` - Aprovar (Admin/Gerente)
- `POST /api/solicitacoes-material/[id]/rejeitar` - Rejeitar (Admin/Gerente)

### **Relatórios**
- `GET /api/relatorios/materiais` - Gerar relatório (Admin/Gerente)

## 🎨 Menu do Sistema

```
📦 Controle de Materiais
  ├─ 📝 Cadastro de Materiais (Admin/Gerente)
  ├─ 🛒 Solicitar Materiais (Todos)
  ├─ ✅ Aprovar Solicitações (Admin/Gerente)
  └─ 📊 Relatórios (Admin/Gerente)
```

## ✨ Funcionalidades Especiais

### **Controle de Estoque Automático**
- Estoque é deduzido automaticamente na aprovação
- Alerta visual quando estoque está abaixo do mínimo
- Impede aprovação se estoque insuficiente

### **Ajuste de Quantidades**
- Gerente pode aprovar quantidade diferente da solicitada
- Útil quando estoque está baixo
- Registra quantidade solicitada e aprovada

### **Histórico Completo**
- Todas as solicitações são registradas
- Data e hora de criação
- Data e hora de aprovação
- Quem aprovou
- Motivo de rejeição

### **Relatórios Detalhados**
- Exportação para CSV
- Filtros por período
- Análise por material
- Análise por funcionário

## 🚀 Como Usar

### **Para Funcionários:**
1. Acesse "Controle de Materiais" → "Solicitar Materiais"
2. Selecione o material desejado
3. Informe a quantidade
4. Adicione observação se necessário
5. Clique em "Adicionar"
6. Repita para outros materiais
7. Clique em "Enviar Solicitação"
8. Acompanhe o status em "Minhas Solicitações"

### **Para Gerentes:**
1. **Cadastrar Material:**
   - Acesse "Controle de Materiais" → "Cadastro de Materiais"
   - Clique em "Novo Material"
   - Preencha os dados
   - Clique em "Salvar"

2. **Aprovar Solicitação:**
   - Acesse "Controle de Materiais" → "Aprovar Solicitações"
   - Visualize solicitações pendentes
   - Clique em "Aprovar" ou "Rejeitar"
   - Ajuste quantidades se necessário
   - Confirme a ação

3. **Visualizar Relatórios:**
   - Acesse "Controle de Materiais" → "Relatórios"
   - Selecione o período
   - Clique em "Buscar"
   - Exporte para CSV se desejar

## 🔒 Segurança

- ✅ Autenticação JWT em todas as APIs
- ✅ Validação de permissões por tipo de usuário
- ✅ Proteção contra exclusão de materiais com histórico
- ✅ Validação de estoque antes de aprovação
- ✅ Registro de todas as ações (quem, quando, o quê)

## 📝 Observações Importantes

1. **Sem Perda de Dados:** O sistema foi implementado sem afetar dados existentes
2. **Compatível:** Funciona junto com todos os módulos existentes
3. **Escalável:** Fácil adicionar novos tipos de materiais
4. **Auditável:** Todas as ações são registradas com data/hora/usuário

## 🎯 Benefícios

- ✅ Controle preciso de materiais
- ✅ Redução de desperdício
- ✅ Rastreabilidade completa
- ✅ Relatórios gerenciais
- ✅ Processo organizado de solicitação
- ✅ Aprovação controlada
- ✅ Histórico completo de uso

---

**Status:** ✅ Sistema implementado e funcional
**Versão:** 1.0.0
**Data:** 16/10/2025
