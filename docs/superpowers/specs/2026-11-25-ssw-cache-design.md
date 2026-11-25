# Cache persistente das entregas SSW

## Objetivo

As telas continuam recebendo o mesmo objeto de rastreamento, enquanto as consultas repetidas respondem pelo banco. O painel público deve mostrar status já conhecido sem esperar por uma chamada à SSW por pedido.

## Abordagem

Foi considerada a ampliação da tabela existente `SswEntregaConsulta` e a criação de uma tabela separada. A ampliação reutiliza a chave única da NF-e e o agendamento de próxima consulta que já existem. O campo JSON guarda o resultado normalizado completo, incluindo ocorrências e campos opcionais de comprovante.

O serviço compartilhado consulta o banco primeiro. Em uma NF-e ainda não salva, consulta a API da SSW e grava o resultado encontrado. A rota de sincronização força nova consulta para registros vencidos, preservando o último resultado válido quando a SSW falhar. Pedidos pendentes são elegíveis após 15 minutos e entregues após 24 horas. A rota limita cada execução a 6 documentos simultâneos para caber no tempo da função.

## Validação antes da produção

Há apenas o banco de produção. A migração não foi aplicada nele. Os testes automatizados usam armazenamento em memória e simulam falha e mudança de status. A validação do esquema Prisma usa uma URL fictícia e não conecta ao banco. Em 25/11/2026, a migração foi aplicada em um PostgreSQL 16 local temporário. A gravação e a atualização do JSON foram verificadas com um registro de teste, e o contêiner temporário foi removido.

## Ativação

A migração aditiva cria `trackingPayload` e um índice para a próxima consulta. Antes de ativar a leitura persistida em produção, aplicar a migração e configurar uma execução periódica da rota protegida `/api/dashboard/sincronizar-rastreios`. A frequência depende do plano da Vercel. O último status salvo pode ficar antigo se a sincronização parar, portanto essa dependência precisa ser monitorada.
