export type BarcodeFormat = 'EAN13' | 'EAN8' | 'CODE128' | 'UNSUPPORTED';
export type LabelType =
  | 'UNITARIA'
  | 'CAIXA_FECHADA'
  | 'A4_PRODUTO'
  | 'A4_PRODUTO_VERTICAL'
  | 'A4_PRODUTO_VERTICAL_DUPLA';

export interface ProdutoEtiqueta {
  produtoId: string;
  codigoAdm: string;
  nome: string;
  marca: string | null;
  codigoOriginal: string | null;
  imagemUrl: string | null;
  codigoBarras: string | null;
  barcodeType: BarcodeFormat;
  codigoBarrasCaixaFechada: string | null;
  quantidadeCaixaFechada: number | null;
}

export interface ProdutosPorMarcaResponse {
  marca: string;
  produtos: ProdutoEtiqueta[];
  total: number;
  catalogo?: {
    total: number;
    atualizadoEm: string | null;
  };
}

export interface ProdutoEtiquetaCatalogo {
  id: string;
  codigoAdm: string;
  nomeVenda: string;
  marca: string | null;
  codigoOriginal: string | null;
  codigoBarras: string | null;
  codigoBarrasCaixaFechada?: string | null;
  quantidadeCaixa: number | null;
  imagemPrincipal: string;
  imagens: string[];
  ativo: boolean;
  updatedAt: string;
}

export interface BarcodeAnalysis {
  isValid: boolean;
  type: BarcodeFormat;
  normalizedValue: string;
  reason?: string;
}

export interface LabelPrintHistoryInput {
  produtoId: string;
  codigoAdm: string;
  nomeProduto: string;
  marcaProduto?: string | null;
  codigoBarras: string;
  quantidade: number;
  impressora: string;
  resultado: 'SUCESSO' | 'ERRO';
  mensagemErro?: string | null;
}

export type QzStatusCode =
  | 'checking'
  | 'connected'
  | 'not_installed'
  | 'authorization_required'
  | 'no_printers'
  | 'error';

export interface QzStatus {
  code: QzStatusCode;
  message: string;
}

/**
 * Etiquetas de Transporte - volumes individuais gerados por lote.
 * Cada volume possui um codigo de barras unico (codigoVolume) usado
 * na conferencia dos volumes no momento do carregamento/entrega.
 */
export interface EtiquetaVolumeData {
  id: string;
  loteId: string;
  indiceVolume: number;
  totalVolumes: number;
  codigoVolume: string;
  impressoEm: string | null;
}

export interface EtiquetaLoteData {
  id: string;
  dataCriacao: string;
  codigoBarras: string;
  numeroNota: string;
  cliente: string;
  cnpj?: string | null;
  transportadora: string;
  numeroPedido: string;
  volumes: number;
  observacoes: string | null;
  criadoPor: string;
  criadoPorNome?: string;
  criadoPorUser?: { nome: string } | null;
  volumesEtiquetas: EtiquetaVolumeData[];
}

export interface TransportLabelInput {
  numeroPedido: string;
  volumes: number;
  cliente?: string;
  cnpj?: string;
  transportadora?: string;
  numeroNota?: string;
  codigoBarras?: string;
  observacoes?: string;
}
