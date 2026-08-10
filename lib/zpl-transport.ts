import { formatarNomeTransportadora } from '@/lib/etiquetas-transporte';
import { sanitizeZpl, splitText } from '@/lib/zpl-generator';
import { EtiquetaLoteData, EtiquetaVolumeData } from '@/types/labels';

/**
 * Etiqueta de transporte — layout fiel ao modelo fisico (Zebra ZD-220, 4×3", 203 dpi).
 *
 * ┌──────────────────────────────────────────────────────┐
 * │ PEDIDO              Expedição: DD/MM/AAAA            │
 * │                                                      │
 * │                  196.284                             │  ← numero enorme
 * │                                                      │
 * │  ║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║║  │  ← barcode CODE128
 * │                                                      │
 * │ ACCERT                       VOLUMES                 │
 * │                               1      /19        [Logo│  ← logo rotacionada
 * │                                                      │
 * │ CLIENTE: VIA BRAZLANDIA MATERIAIS                    │
 * │ CNPJ: 12.345.678/0001-90                             │
 * └──────────────────────────────────────────────────────┘
 *
 * Para incluir o logo na impressora Zebra, o arquivo LOGO_OFICIAL.GRF
 * deve estar carregado na memoria da printer. Descomente o comando ^XG abaixo.
 */
const PAGE_WIDTH = 812;
const PAGE_HEIGHT = 609;
const PRINT_DARKNESS = 28; // Zebra range: 0 (light) to 30 (dark)

function formatDataAtual(): string {
  return new Date().toLocaleDateString('pt-BR');
}

export function generateZplTransportLabel(
  lote: Pick<EtiquetaLoteData, 'numeroPedido' | 'numeroNota' | 'cliente' | 'cnpj' | 'transportadora'>,
  volume: Pick<EtiquetaVolumeData, 'codigoVolume' | 'indiceVolume' | 'totalVolumes'>,
): string {
  const pedido = sanitizeZpl(lote.numeroPedido);
  const cliente = splitText(lote.cliente || 'SEM CLIENTE', 38, 1).join(' ').toUpperCase();
  const cnpj = sanitizeZpl(lote.cnpj || '');
  const transportadora = sanitizeZpl(formatarNomeTransportadora(lote.transportadora || ''));
  const codigoVolume = sanitizeZpl(volume.codigoVolume);
  const data = formatDataAtual();

  const commands = [
    `~SD${PRINT_DARKNESS}`,
    '^XA',
    `^PW${PAGE_WIDTH}`,
    `^LL${PAGE_HEIGHT}`,
    '^LH0,0',

    // ── Fundo cinza claro ──
    '^FO8,8^GB796,593,3^FS',

    // ── Linha de cabecalho ──
    // "PEDIDO" — topo-esquerda, texto pequeno
    '^FO25,18^A0N,20,20^FDPEDIDO^FS',
    // "Expedição: DD/MM/AAAA" — topo-centro
    `^FO320,18^A0N,20,20^FDExpedição: ${data}^FS`,

    // ── Numero do pedido — DOMINANTE ──
    `^FO25,52^A0N,110,110^FD${pedido}^FS`,

    // ── Codigo de barras (CODE128) ──
    `^FO25,180^BY3,2,60^BCN,60,Y,N,N^FD${codigoVolume}^FS`,

    // ── Transportadora (lado esquerdo) ──
  ];

  if (transportadora && transportadora !== 'RETIRA_CLIENTE') {
    commands.push(`^FO25,270^A0N,40,40^FD${transportadora}^FS`);
  }

  commands.push(
    // ── Volumes (lado direito) ──
    '^FO490,258^A0N,16,16^FDVOLUMES^FS',
    `^FO490,280^A0N,55,55^FD${volume.indiceVolume} /${volume.totalVolumes}^FS`,

    // ── CLIENTE ──
    `^FO25,365^A0N,28,28^FDCLIENTE: ${cliente}^FS`,

    // ── CNPJ do cliente ──
    ...(cnpj ? [`^FO25,405^A0N,28,28^FDCNPJ: ${cnpj}^FS`] : []),

    // ── Logo Esplendor (lateral direita, rotacionada 90°) ──
    // Requer LOGO_OFICIAL.GRF carregado na memoria da impressora.
    // Descomente a linha abaixo apos fazer o upload do GRF:
    // '^FO680,140^FWB^XGR:LOGO_OFICIAL.GRF,1,1^FS',
  );

  commands.push('^PQ1,0,1,Y', '^XZ');

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
