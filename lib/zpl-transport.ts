import { formatarNomeTransportadora } from '@/lib/etiquetas-transporte';
import { sanitizeZpl, splitText } from '@/lib/zpl-generator';
import { EtiquetaLoteData, EtiquetaVolumeData } from '@/types/labels';

const PAGE_WIDTH = 812;
const PAGE_HEIGHT = 609;
const PRINT_DARKNESS = 28;
const TRANSPORT_LOGO_GRF = [
  '~DGR:LOGO_OFICIAL.GRF,00672,014,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000,',
  '0000000000C00003000000000000,',
  '0000000001E0000F800000000000,',
  '0000000003F0001FE00000000000,',
  '000000000FF8003FF00000000000,',
  '000000001FFC003FF80000000000,',
  '000000003FF8001FFE0000000000,',
  '00000000FFF0038FFF0000000000,',
  '00000001FFE307C7FFC000000000,',
  '00000003FFC78FE3FFE000000000,',
  '0000000FFFC7FC2207F000000000,',
  '0000000FFFCFC00003F800000000,',
  '0000000F7F8F800003F980000000,',
  '000000003C0F80000003C0000000,',
  '00000000039F80000003C0000000,',
  '0000000003DFFC000003C0000000,',
  '001F0FCFF3DFFE03FC3FC7C7E000,',
  '007F9FEFFBDFFF03FE7FCFE7EC00,',
  '007FFFCFFBDFFF03FFFFDFF7E000,',
  '00F3FC0F7FDF8003CFFBDEF78000,',
  '00F7FF8E3FDF8003CFF3FC7F8000,',
  '00FFFFEE3FCFC083CFF3FC7F8000,',
  '00FFCFFE3FCFE3C3CFF3FC7F8000,',
  '00F000FF3FC7FFE3CFF3DCF78000,',
  '00FF9FFFFFE7FFF3CFFFDFF78000,',
  '007FFFEFFBE3FFE3CF7FDFF78000,',
  '003FBFCFF1E0FF83CF7FCFE78000,',
  '000E0F0E60600001861983830000,',
  '0000000E00000000000000000000,',
  '0000000E00000000000000000000,',
  '0000000E3FFFF000000000000000,',
  '0000000E3FFFFC00000000000000,',
  '0000000E3C000000000000000000,',
  '0000000000000000040060C18000,',
  '0000000000608183040860418000,',
  '0000000030408203010810414000,',
  '000000003041C207060860000000,',
  '0000000038414180000000000000,',
  '0000000000000000000000000000,',
  '0000000000000000000000000000',
].join('\n');

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
    TRANSPORT_LOGO_GRF,
    `~SD${PRINT_DARKNESS}`,
    '^XA',
    `^PW${PAGE_WIDTH}`,
    `^LL${PAGE_HEIGHT}`,
    '^LH0,0',
    '^FO8,8^GB796,593,3^FS',
    '^FO25,18^A0N,20,20^FDPEDIDO^FS',
    '^FO458,16^XGR:LOGO_OFICIAL.GRF,1,1^FS',
    `^FO598,18^A0N,20,20^FDExpedicao: ${data}^FS`,
    `^FO18,52^A0N,132,132^FD${pedido}^FS`,
    `^FO36,188^BY3,2,72^BCN,72,N,N,N^FD${codigoVolume}^FS`,
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
