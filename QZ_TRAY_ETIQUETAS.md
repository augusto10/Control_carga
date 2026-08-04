# QZ Tray para Criar Etiquetas

## Instalação

1. Baixe e instale o QZ Tray em `https://qz.io/download/`.
2. Reinicie o computador se o serviço não iniciar automaticamente.
3. Abra o QZ Tray e confirme que o ícone está ativo na bandeja do sistema.

## Seleção da Zebra

1. Conecte a Zebra ZD220 via USB.
2. Abra a tela `Criar Etiquetas`.
3. Clique em `Atualizar impressoras`.
4. Selecione a impressora com nome contendo `ZD220`, `Zebra` ou `ZDesigner`.

## Autorizar o site

1. Na primeira impressão, aceite a autorização do QZ Tray.
2. Marque a opção para confiar no certificado local apenas no ambiente controlado de desenvolvimento.

## Produção com assinatura

Defina:

- `NEXT_PUBLIC_QZ_TRAY_CERT`
- `NEXT_PUBLIC_QZ_TRAY_SIGNATURE_ENDPOINT`

O endpoint de assinatura deve assinar o payload enviado pelo QZ Tray no backend. Não deixe a assinatura desabilitada em produção.

## Testar a Zebra ZD220

1. Pesquise o produto teste `100879`.
2. Confirme o código `0087946736552`.
3. Defina a quantidade como `3`.
4. Verifique alinhamento, leitura do bipador e margens laterais.

## Problemas comuns

- `QZ Tray não está conectado`: confirme se o aplicativo está aberto e liberado no firewall.
- `Nenhuma impressora Zebra foi encontrada`: reinstale o driver `ZDesigner` ou reconecte a USB.
- `Falha de impressão`: teste uma página de diagnóstico no Windows para validar a fila local.
