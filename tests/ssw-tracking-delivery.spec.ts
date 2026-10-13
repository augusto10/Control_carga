import assert from 'node:assert/strict';
import { hasSswDeliveredOccurrence, isSswOccurrenceDelivered } from '../services/sswTracking';

const occurrence = (
  ocorrencia: string,
  descricao: string | null = null
) => ({
  dataHora: null,
  dataHoraEfetiva: null,
  cidade: null,
  filial: null,
  dominio: 'ACC',
  tipo: 'Informativo',
  ocorrencia,
  descricao,
  ocorrenciaSsw: null,
  usuario: null,
  detalhe: null,
  documentos: null,
  conferentes: null,
  imagem: null,
  imagemUrl: null,
});

assert.equal(
  isSswOccurrenceDelivered(occurrence('ENTREGUE (SSWMOBILE)')),
  true
);

assert.equal(
  isSswOccurrenceDelivered(occurrence('Pedido não entregue', 'Destinatário ausente')),
  false
);

assert.equal(
  isSswOccurrenceDelivered(occurrence('Comprovante de entrega anexado ao CTRC', 'Entrega realizada em 05/10/26')),
  true
);

assert.equal(
  hasSswDeliveredOccurrence([
    occurrence('Saída para entrega'),
    occurrence('ENTREGUE (SSWMOBILE)'),
    occurrence('PDF da NFS-e importado (usando dados do arquivo)'),
  ]),
  true
);

assert.equal(
  hasSswDeliveredOccurrence([
    occurrence('Saída para entrega'),
    occurrence('PDF da NFS-e importado (usando dados do arquivo)'),
  ]),
  false
);

console.log('Detecção de ocorrências de entrega SSW: 5 verificações passaram.');
