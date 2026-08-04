export type BarcodeFormat = 'EAN13' | 'EAN8' | 'CODE128' | 'UNSUPPORTED';

export interface ProdutoEtiqueta {
  produtoId: string;
  codigoAdm: string;
  nome: string;
  marca: string | null;
  codigoBarras: string | null;
  barcodeType: BarcodeFormat;
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
