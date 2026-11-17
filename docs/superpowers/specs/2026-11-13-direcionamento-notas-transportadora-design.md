# Direcionamento de Notas por Transportadora — Design

## Intenção

Permitir que cada nota fiscal ainda não vinculada a um controle seja direcionada para uma transportadora. Ao criar um controle, o usuário deve visualizar as notas direcionadas para a transportadora do controle, selecionar apenas as que serão usadas agora e deixar as demais disponíveis para controles futuros. O usuário também pode transferir notas selecionadas para outra transportadora; nesse caso elas saem da seleção e ficam aguardando um controle da nova transportadora.

O objetivo é organizar a preparação dos controles sem alterar controles históricos ou interromper o fluxo que já funciona em produção.

## Regras confirmadas

- As notas podem ser cadastradas a qualquer momento.
- Controles existentes e suas notas já vinculadas não participam da nova classificação e não serão alterados pela migração.
- Cada nota sem controle pode ter uma transportadora de destino.
- Enquanto estiver sem controle (`controleId = null`), a nota pode receber ou trocar sua transportadora de destino a qualquer momento.
- O direcionamento pode ser feito em **Adicionar notas** e também no fluxo de **Criar controle**.
- Se uma nota lida ou informada manualmente já estiver cadastrada, o sistema deve avisar imediatamente **“Esta nota já está salva”** e não adicioná-la novamente à lista de salvamento.
- Em **Adicionar notas**, o usuário escolhe uma transportadora padrão para o lote e pode alterar a transportadora de uma nota individual antes de salvar.
- Em **Criar controle**, a transportadora do controle determina a lista de notas disponíveis.
- O usuário escolhe quais notas entram no controle atual.
- Notas não escolhidas continuam aguardando um futuro controle da mesma transportadora.
- O usuário pode selecionar notas disponíveis e transferi-las para outra transportadora.
- Notas transferidas saem da lista e da seleção atuais e ficam disponíveis para um futuro controle da transportadora de destino.
- No momento da criação do controle, toda nota selecionada deve ter o mesmo destino da transportadora do controle.
- Todas as transportadoras expostas por `/api/transportadoras` e pelo enum `Transportadora` participam do recurso.
- Um controle não finalizado pode ser editado por usuário autenticado que já possui acesso ao fluxo operacional.
- Um controle finalizado só pode ser alterado por usuário com perfil `ADMIN`; a API deve aplicar essa regra no servidor, independentemente da interface.

## Compatibilidade e dados legados

Adicionar `transportadoraDestino Transportadora?` ao modelo `NotaFiscal`. A coluna começa opcional, sem valor padrão e sem atualização em massa. Assim, a migração é aditiva e não reescreve notas antigas.

- Nota antiga com `controleId` preenchido: permanece intocada e não aparece nas filas de direcionamento.
- Nota antiga sem controle e sem destino: aparece em **Sem transportadora**, de onde pode ser classificada antes de entrar em um novo controle.
- Nota nova: a interface exige destino, e a API nova valida o destino.
- Durante a implantação gradual, a API continua aceitando o formato antigo sem destino para não quebrar uma interface ainda armazenada em cache; essas notas entram em **Sem transportadora**. O servidor não precisa distinguir versões do cliente: campo presente é validado e gravado; campo ausente é tratado como legado e gravado como `null`. A obrigatoriedade para o fluxo novo é aplicada também na interface.
- O fluxo novo só permite vincular notas com destino correspondente; notas em **Sem transportadora** precisam ser direcionadas antes. Para compatibilidade com clientes antigos, os endpoints de criação/vínculo ainda podem vincular nota sem destino, sem preencher ou modificar `transportadoraDestino`.

Não será aplicado `NOT NULL` nesta entrega. Isso mantém compatibilidade de implantação e conserva uma representação explícita para registros legados não classificados.

## Abordagens consideradas

### 1. Campo opcional na própria nota — escolhida

Adicionar `transportadoraDestino` em `NotaFiscal`. É a alternativa mais direta, consulta bem, reutiliza o enum existente e permite implantação gradual sem tocar em históricos.

### 2. Uma transportadora apenas por lote

Guardar o destino somente no envio do lote simplificaria a tela, mas impediria ajustes individuais antes do salvamento e não atenderia completamente ao fluxo solicitado.

### 3. Tabela separada de direcionamentos

Uma tabela de histórico permitiria auditar todas as trocas, mas criaria joins, regras de vigência e manutenção adicionais sem necessidade atual. Pode ser considerada no futuro se houver requisito de auditoria detalhada.

## Fluxo de interface

### Adicionar notas

```text
Transportadora do lote: [ACCERT ▼]

NF 1001  Volumes: 2  Transportadora: [ACCERT ▼]
NF 1002  Volumes: 1  Transportadora: [ACCERT ▼]
NF 1003  Volumes: 4  Transportadora: [Expresso Goiás ▼]

[Salvar 3 notas]
```

A escolha do lote preenche novas notas escaneadas ou inseridas manualmente. Alterar a transportadora do lote não deve sobrescrever silenciosamente notas que o usuário já ajustou individualmente. Cada cartão de nota mostra o destino e permite alterá-lo antes de salvar.

Ao ler o código ou informar a nota manualmente, a tela verifica tanto a lista ainda não salva quanto os registros persistidos. Se encontrar a nota, exibe o aviso **“Esta nota já está salva”**, mantém o registro existente intacto e não cria outro cartão. A chave/código da nota é o identificador preferencial; o número normalizado da nota é usado como alternativa quando não houver uma chave válida.

### Criar controle

```text
Transportadora do controle: [ACCERT ▼]

Notas disponíveis para ACCERT
☑ NF 1001
☑ NF 1002
☐ NF 1003

[Transferir selecionadas para: Expresso Goiás ▼] [Confirmar transferência]
```

Ao trocar a transportadora do controle, a seleção de notas atual é limpa e a lista é recarregada para evitar mistura acidental. Ao transferir notas, a tela pede confirmação, persiste a nova transportadora, remove essas notas da seleção atual e atualiza as filas. A transferência nunca cria um controle.

A lista **Sem transportadora** fica disponível como filtro dentro da seção de notas. O usuário pode selecionar itens dessa lista e atribuí-los à transportadora do controle, mas não pode vinculá-los diretamente enquanto estiverem sem destino.

## API e regras do servidor

### Consulta de notas

Estender `GET /api/notas` com filtros opcionais:

- `disponiveis=1`: somente `controleId = null` com destino preenchido, a menos que também seja solicitada a fila `semTransportadora`;
- `transportadoraDestino=<enum>`: somente notas daquele destino;
- `semTransportadora=1`: somente notas sem destino.

Manter os filtros atuais e o formato compatível, adicionando `transportadoraDestino` à resposta.

### Salvamento de notas

Estender `POST /api/notas/salvar-multiplas` para aceitar `transportadoraDestino` em cada nota. Validar contra o enum no servidor. Requisições da interface nova exigem o campo; requisições antigas permanecem aceitas durante a implantação gradual e criam notas sem classificação.

Manter a validação de duplicidade no servidor mesmo com o aviso antecipado da tela. A consulta feita após a leitura melhora a experiência, mas o salvamento continua sendo a proteção definitiva contra duas telas ou usuários tentando cadastrar a mesma nota ao mesmo tempo. Quando houver duplicidade, a API responde com conflito (`409`) e uma mensagem consistente: **“Esta nota já está salva”**. Antes de criar uma restrição única no banco, a implantação deve auditar eventuais duplicidades históricas para não interromper a migração.

### Transferência de notas

Criar uma operação dedicada que receba `notaIds[]` e `transportadoraDestino`. Em uma transação:

1. validar enum e IDs;
2. confirmar que todas as notas existem;
3. confirmar que todas continuam com `controleId = null`;
4. atualizar apenas essas notas;
5. retornar a quantidade e os IDs atualizados.

Se qualquer nota já tiver sido vinculada por outro usuário, a operação inteira falha com conflito e nenhuma nota é transferida.

A transferência pode ocorrer em qualquer momento anterior ao vínculo com um controle. Depois do vínculo, a nota deixa de participar desse fluxo de direcionamento.

### Criação do controle

Concentrar a criação do controle e o vínculo das notas em uma única transação no `POST /api/controles`:

1. validar dados do controle e a transportadora;
2. buscar todas as notas solicitadas;
3. confirmar que todas existem, estão sem controle e têm `transportadoraDestino` igual à transportadora do controle; a exceção de compatibilidade para payloads antigos permite vincular destino `null` sem preencher o campo, enquanto a interface nova exige direcionamento prévio;
4. criar o controle;
5. vincular as notas;
6. confirmar que o número atualizado corresponde ao número solicitado.

O fluxo atual conecta notas durante a criação e depois tenta vinculá-las novamente pelo cliente. A implementação deve remover essa segunda chamada e tornar o servidor a única autoridade do vínculo. Em conflito, retornar `409` com mensagem clara e não criar controle parcial.

Criar um controle sem selecionar notas continua permitido, preservando o comportamento atual. A regra de não criar controle vazio se aplica quando `notasIds` foi enviado com itens e o vínculo falhou ou ficou incompleto.

### Edição posterior do controle

O `PUT /api/controles/[id]` deve carregar o estado atual antes de atualizar:

- se `finalizado = false`, permitir a edição para usuário autenticado com acesso ao fluxo;
- se `finalizado = true`, permitir somente quando `req.user.tipo === 'ADMIN'`;
- responder `403` quando um usuário sem permissão tentar alterar controle finalizado;
- validar a transportadora pelo enum no servidor.

`transportadoraDestino` é uma informação de roteamento enquanto a nota está disponível. Depois do vínculo, a transportadora do controle passa a ser a fonte de verdade. Portanto, editar a transportadora do controle não atualiza `transportadoraDestino` das notas já vinculadas e não inclui notas históricas na nova implementação.

O endpoint legado `POST /api/controles/vincular-notas` deve verificar a mesma permissão de edição: controle aberto para usuário autenticado e finalizado somente para `ADMIN`. Conforme a revisão solicitada em 17/11/2026, `DELETE /api/controles/[id]` exige `ADMIN` e permite excluir qualquer controle, inclusive finalizado. A exclusão desvincula e preserva notas e pedidos, remove os itens de associação de frete e mantém o registro de pagamento. A edição aceita `notasIds` para substituir a seleção de notas na mesma transação dos demais campos. A visualização de PDF exige controle finalizado.

## Banco de dados

Alteração planejada:

```prisma
model NotaFiscal {
  // campos existentes
  transportadoraDestino Transportadora?

  @@index([transportadoraDestino, controleId])
}
```

O índice composto atende a consulta principal por igualdade de transportadora e disponibilidade. Antes da migração final, deve-se confirmar no PostgreSQL o nome físico da tabela e das colunas geradas pelo Prisma. A migração deve conter apenas a coluna opcional e o índice, sem atualização de registros existentes.

## Concorrência e integridade

- A interface nunca é a única camada de validação.
- Transferência e criação do controle usam transações.
- Uma nota que foi vinculada depois de carregada na tela causa conflito, não mudança silenciosa.
- A criação do controle não pode deixar um controle vazio ou parcialmente vinculado por causa de erro no vínculo.
- Trocar a transportadora do controle limpa a seleção anterior.
- Endpoints de alteração devem exigir a mesma autenticação/autorização usada pelas telas operacionais.
- A permissão de editar controle finalizado deve ser verificada no `PUT`, não apenas escondendo botões na interface.

## Implantação segura

1. Auditar duplicidades e confirmar os nomes físicos do PostgreSQL antes de aplicar a migration.
2. Aplicar a migration aditiva com coluna opcional e índice; não fazer backfill.
3. Publicar backend capaz de ler e gravar o novo campo, mantendo compatibilidade com payload antigo.
4. Publicar **Adicionar notas** com seleção de destino.
5. Publicar **Criar controle** com filtro, transferência e validação transacional.
6. Monitorar conflitos, erros de validação e quantidade de notas em **Sem transportadora**.
7. Manter rollback da aplicação compatível com a coluna extra; não remover a coluna durante rollback.

O checklist de pré-auditoria, as consultas SQL somente leitura, a ordem de deploy, os sinais de monitoramento e o rollback estão em [`../plans/2026-11-13-direcionamento-notas-transportadora-rollout.md`](../plans/2026-11-13-direcionamento-notas-transportadora-rollout.md).

## Testes de aceitação

- Salvar lote com uma transportadora padrão e exceção individual.
- Ao ler ou informar uma nota já cadastrada, avisar imediatamente que ela já está salva e não incluí-la novamente.
- Simular dois usuários salvando a mesma nota ao mesmo tempo; apenas um cadastro deve ser criado e o outro deve receber conflito de duplicidade.
- Listar apenas notas sem controle da transportadora selecionada.
- Criar controle com parte das notas e manter as restantes disponíveis.
- Transferir notas para outra transportadora e removê-las da lista atual.
- Cadastrar uma nota e direcioná-la ou redirecioná-la em outro momento enquanto ela estiver sem controle.
- Recusar vínculo de nota de transportadora diferente.
- Recusar transferência de nota já vinculada.
- Simular dois usuários tentando usar a mesma nota; apenas um controle deve ser criado com ela.
- Criar intencionalmente um controle sem notas e preservar o comportamento atual.
- Confirmar que controles e notas históricas vinculadas continuam iguais.
- Confirmar que nota antiga sem controle aparece em **Sem transportadora**.
- Confirmar que uma requisição antiga de criação de nota ainda funciona durante a implantação gradual.
- Confirmar que usuário autenticado pode editar controle aberto.
- Confirmar que somente `ADMIN` pode editar controle finalizado e que os demais recebem `403`.
- Confirmar que editar a transportadora de um controle não modifica as notas históricas já vinculadas.

## Fora do escopo

- Alterar automaticamente dados de controles já existentes durante a migração.
- Reclassificar automaticamente notas históricas com base na transportadora do controle.
- Manter histórico completo de cada troca de transportadora.
- Transformar transportadoras em cadastro dinâmico; nesta entrega continuam vindo do enum existente.
- Modificar relatórios históricos, PDFs ou regras de frete além de expor o novo campo quando necessário para a tela operacional.

## Decisões deixadas ao implementador

- Nome e layout exatos do diálogo de confirmação da transferência, respeitando o padrão visual já usado pelo projeto.
- Organização interna dos tipos compartilhados, desde que o enum do Prisma permaneça a fonte de verdade no servidor.
- Estratégia de atualização do estado após transferência: atualização local confirmada pela resposta ou nova busca, priorizando consistência.
