# Biometria SecuGen U20-A

O cadastro e a identificação usam o FDx SDK Pro para Windows (comparação
automática no computador conectado ao leitor). O agente faz uma captura e
compara o template com os separadores ativos cadastrados. O SDK fornece
comparação 1:1; para identificação 1:N o agente repete essa comparação para
cada cadastro. Ele envia ao navegador somente o resultado, nunca a lista de
templates nem as credenciais ADM.

## Configuração do servidor

As colunas `codigoAdm`, `senhaAdm` e `biometria` já existem na tabela `Usuario`.
Elas foram adicionadas ao schema Prisma; não execute migração para essas
colunas.

Configure no ambiente do servidor:

- `BIOMETRIA_ENCRYPTION_KEY`: 32 bytes aleatórios codificados em 64 caracteres
  hexadecimais. Criptografa os templates guardados em `Usuario.biometria`.
- `BIOMETRIA_AGENT_TOKEN`: token aleatório longo compartilhado entre o servidor
  e o agente local.

Gere valores localmente sem publicá-los no repositório:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Gere um valor separado para cada variável. Configure-os no ambiente de
produção e no `.env` local, quando aplicável. Não use prefixo `NEXT_PUBLIC_`.
Templates biométricos antigos em Base64 continuam legíveis para o agente; novas
capturas são armazenadas com AES-256-GCM.

## Preparar o computador Windows

### Instalação pela tela do totem

Quando o agente não estiver disponível, a tela de separação oferece **Baixar
instalador do agente**. Execute o arquivo PowerShell com:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-biometric-agent.ps1
```

O instalador baixa o pacote leve publicado pelo próprio ControlCarga, instala o
runtime ASP.NET Core 8 pelo `winget` quando necessário, solicita o
`BIOMETRIA_AGENT_TOKEN`, grava a configuração em
`%LOCALAPPDATA%\ControlCarga\biometric-agent`, cria o atalho de inicialização e
abre o agente. O token não faz parte do pacote publicado. O driver SecuGen U20-A
ainda precisa estar instalado no computador.

1. Instale o driver oficial U20-A em cada computador e conecte o leitor.
   Consulte [drivers SecuGen](https://secugen.com/drivers/).
2. Feche o SGDX e qualquer outro programa que esteja usando o leitor. O leitor
   é de acesso exclusivo durante a captura.
3. Instale o .NET 8 SDK para compilar o agente.
4. Compile usando a pasta do SDK FDx que contém `DotNET`, `bin` e `Inc`:

   ```powershell
   .\biometric-agent\build-windows-agent.ps1 `
     -SecuGenSdkRoot 'C:\caminho\FDx SDK Pro for Windows v4.3.1'
   ```

5. Edite `%LOCALAPPDATA%\ControlCarga\biometric-agent\appsettings.json`:
   - `ServerBaseUrl`: domínio HTTPS do ControlCarga; em desenvolvimento, pode
     ser `http://localhost:3000`.
   - `AgentToken`: o mesmo `BIOMETRIA_AGENT_TOKEN` configurado no servidor.
   - `AllowedOrigins`: origem exata do site aberto no navegador, incluindo
     esquema e porta (por exemplo `https://controle.empresa.com`).
6. Execute `%LOCALAPPDATA%\ControlCarga\biometric-agent\biometric-agent.exe`.
   Mantenha essa janela aberta enquanto o computador estiver sendo usado para
   cadastro ou separação.
7. Confirme que o agente está ativo com
   `Invoke-RestMethod http://127.0.0.1:17876/health`.

O agente escuta somente em loopback (`127.0.0.1`). A pasta publicada é
autocontida e pode ser copiada para outras estações x64 após a instalação do
driver. Cada estação precisa de seu próprio leitor e arquivo de configuração.
Não compartilhe `appsettings.json` publicamente, pois contém o token do agente.

## Uso

### Teste local

O agente de teste compilado está em `biometric-agent/local-test`. Execute
`biometric-agent/local-test/biometric-agent.exe` e mantenha-o aberto. A configuração
local permite as origens `http://localhost:3000`, `http://localhost:3001` e os
equivalentes em `127.0.0.1`. `ServerBaseUrl` deve apontar para a porta do servidor
em uso; atualmente está em `http://127.0.0.1:3000`.

Inicie o site com `npm.cmd run dev -- --port 3000` (ou `--port 3001`). Caso troque
a porta, ajuste `ServerBaseUrl` no `appsettings.json` do agente e reinicie-o.
Os arquivos de configuração reais e as pastas compiladas são ignorados pelo Git.

No formulário de usuários, preencha **Código ADM** e **Senha ADM**, salve e depois
use **Cadastrar digital**. Deixar a senha ADM vazia ao editar preserva a senha
existente. A senha ADM não é devolvida nas respostas das APIs.

A biblioteca SecuGen deve ficar em arquivo separado ao lado do executável;
o agente é publicado com `PublishSingleFile=false` para permitir seu carregamento.

- **Cadastro:** em Gestão de Usuários, edite um usuário e escolha
  **Cadastrar digital**. Para substituir ou remover, use as ações no mesmo
  formulário. Cadastros novos precisam ser salvos antes de registrar a digital.
- **Totem:** em `/separacao`, toque em **Associar pedido** e depois em
  **Ler digital e iniciar separação**. O código ADM e a senha ADM são
  recuperados no servidor e não passam pelo navegador.

As APIs do agente exigem a origem configurada; chamadas do navegador também
podem solicitar permissão de acesso à rede local. Se o leitor não for
encontrado, confira o driver e feche o SGDX antes de tentar novamente.
