import { formatarNomeTransportadora } from '@/lib/etiquetas-transporte';
import { sanitizeZpl, splitText } from '@/lib/zpl-generator';
import { EtiquetaLoteData, EtiquetaVolumeData } from '@/types/labels';

const PAGE_WIDTH = 812;
const PAGE_HEIGHT = 609;
const PRINT_DARKNESS = 28;

function formatDataAtual(): string {
  return new Date().toLocaleDateString('pt-BR');
}

export function generateZplTransportLabel(
  lote: Pick<EtiquetaLoteData, 'numeroPedido' | 'numeroNota' | 'cliente' | 'cnpj' | 'transportadora'>,
  volume: Pick<EtiquetaVolumeData, 'codigoVolume' | 'indiceVolume' | 'totalVolumes'>,
): string {
  const pedido = sanitizeZpl(lote.numeroPedido);
  const numeroNota = sanitizeZpl(lote.numeroNota || '');
  const cliente = splitText(lote.cliente || 'SEM CLIENTE', 38, 1).join(' ').toUpperCase();
  const cnpj = sanitizeZpl(lote.cnpj || '');
  const transportadora = sanitizeZpl(formatarNomeTransportadora(lote.transportadora || ''));
  const codigoVolume = sanitizeZpl(volume.codigoVolume);
  const data = formatDataAtual();
  const transportadoraLines =
    transportadora && transportadora !== 'RETIRA_CLIENTE'
      ? splitText(transportadora, 24, 2)
      : [];

  const commands = [
    `~SD${PRINT_DARKNESS}`,
    '^XA',
    `^PW${PAGE_WIDTH}`,
    `^LL${PAGE_HEIGHT}`,
    '^LH0,0',
    '^FO8,8^GB796,593,3^FS',
    '^FO25,18^A0N,20,20^FDPEDIDO^FS',
    '^FO330,16^FB220,1,0,C,0^A0N,26,26^FDESPLENDOR^FS',
    `^FO620,18^A0N,20,20^FDExpedicao: ${data}^FS`,
    `^FO12,46^A0N,142,142^FD${pedido}^FS`,
    `^FO700,92^BQN,2,4^FDLA,${pedido}^FS`,
    `^FO34,188^BY2,2,68^BCN,68,N,N,N^FD${codigoVolume}^FS`,
  ];

  transportadoraLines.forEach((line, index) => {
    commands.push(`^FO25,${282 + (index * 38)}^A0N,34,34^FD${line}^FS`);
  });

  commands.push(
    '^FO585,278^A0N,18,18^FDVOLUMES^FS',
    `^FO545,298^A0N,60,60^FD${volume.indiceVolume}/${volume.totalVolumes}^FS`,
    ...(numeroNota ? [`^FO25,366^A0N,24,24^FDNF: ${numeroNota}^FS`] : []),
    `^FO25,400^A0N,26,26^FDCLIENTE: ${cliente}^FS`,
    ...(cnpj ? [`^FO25,434^A0N,24,24^FDCNPJ: ${cnpj}^FS`] : []),
    '^PQ1,0,1,Y',
    '^XZ',
  );

  return commands.join('\n');
}

export function generateZplTransportLabels(
  lote: Pick<EtiquetaLoteData, 'numeroPedido' | 'numeroNota' | 'cliente' | 'cnpj' | 'transportadora'>,
  volumes: Pick<EtiquetaVolumeData, 'codigoVolume' | 'indiceVolume' | 'totalVolumes'>[],
): string {
  if (volumes.length === 0) {
    throw new Error('Nenhum volume para imprimir.');
  }

  return volumes.map((volume) => generateZplTransportLabel(lote, volume)).join('\n');
}
