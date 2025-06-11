# Controle de Carga Web

Sistema web para controle de carga e notas fiscais com leitura de código de barras.

## Funcionalidades

- Leitura de notas fiscais via código de barras
- Controle de cargas com múltiplas notas fiscais
- Geração de manifestos em PDF
- Banco de dados PostgreSQL
- Interface moderna e responsiva

## Tecnologias

- Next.js
- TypeScript
- Material-UI
- Prisma
- PostgreSQL
- ZXing-js
- Vercel

## Requisitos

- Node.js 18+
- PostgreSQL
- npm ou yarn

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/controle-carga-web.git
cd controle-carga-web
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados:
- Crie um banco PostgreSQL
- Copie o arquivo `.env.example` para `.env`
- Atualize as variáveis de ambiente

4. Execute as migrações:
```bash
npx prisma migrate dev
```

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

## Deploy

O projeto está configurado para deploy no Vercel. Para deploy:

1. Crie uma conta no Vercel
2. Conecte seu repositório
3. Configure as variáveis de ambiente
4. Faça o deploy

## Uso

1. Acesse o sistema através do navegador
2. Clique em "Novo Controle" para criar um novo registro
3. Use o scanner de código de barras para adicionar notas fiscais
4. Gere manifestos em PDF quando necessário
