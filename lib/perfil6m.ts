export interface Perfil6mReferencia {
  codigoCatalogo: string;
  descricao: string;
  codigoBarras: string;
  codigoInterno: string;
}

export interface Perfil6mItemLookup {
  produtoNome?: string | null;
  codigoBarras?: string | null;
  codigoOriginal?: string | null;
}

export interface Perfil6mMatchResult {
  match: boolean;
  referencia: Perfil6mReferencia | null;
  matchBy: 'codigo_barras' | 'codigo_original' | 'descricao' | null;
}

export const PERFIL_6M_REFERENCIAS: Perfil6mReferencia[] = [
  { codigoCatalogo: '31.497', descricao: 'TUBO SOLD 75MM BR C/ 6M', codigoBarras: '7898527884554', codigoInterno: '0303200015' },
  { codigoCatalogo: '31.496', descricao: 'TUBO SOLD 60MM BR C/ 6M', codigoBarras: '7898527884530', codigoInterno: '0303200009' },
  { codigoCatalogo: '37.523', descricao: 'TUBO SOLD 60MM BR C/ 6M', codigoBarras: '7898935215131', codigoInterno: '01020106' },
  { codigoCatalogo: '20.906', descricao: 'TUBO SOLD 50MM BR C/ 6M', codigoBarras: '7898543590682', codigoInterno: '10000501' },
  { codigoCatalogo: '37.522', descricao: 'TUBO SOLD 50MM BR C/ 6M', codigoBarras: '7898935215124', codigoInterno: '01020105' },
  { codigoCatalogo: '37.521', descricao: 'TUBO SOLD 40MM BR C/ 6M', codigoBarras: '7898935215117', codigoInterno: '01020104' },
  { codigoCatalogo: '31.494', descricao: 'TUBO SOLD 40MM BR C/ 6M', codigoBarras: '7898527884516', codigoInterno: '0303200007' },
  { codigoCatalogo: '37.520', descricao: 'TUBO SOLD 32MM BR C/ 6M', codigoBarras: '7898935215100', codigoInterno: '01020103' },
  { codigoCatalogo: '20.903', descricao: 'TUBO SOLD 25MM BR C/ 6M', codigoBarras: '7898543590668', codigoInterno: '10000251' },
  { codigoCatalogo: '37.519', descricao: 'TUBO SOLD 25MM BR C/ 6M', codigoBarras: '7898935215094', codigoInterno: '01020102' },
  { codigoCatalogo: '37.518', descricao: 'TUBO SOLD 20MM BR C/ 6M', codigoBarras: '7898935215087', codigoInterno: '01020101' },
  { codigoCatalogo: '37.515', descricao: 'TUBO ESG 200MM BR C/ 6M', codigoBarras: '7898935215506', codigoInterno: '01010106' },
  { codigoCatalogo: '37.514', descricao: 'TUBO ESG 150MM BR C/ 6M', codigoBarras: '7898935215056', codigoInterno: '01010105' },
  { codigoCatalogo: '37.513', descricao: 'TUBO ESG 100MM BR C/ 6M', codigoBarras: '7898935215049', codigoInterno: '01010104' },
  { codigoCatalogo: '21.033', descricao: 'TUBO ESG 100MM BR C/ 6M', codigoBarras: '7898543590729', codigoInterno: '11001001' },
  { codigoCatalogo: '31.502', descricao: 'TUBO ESG 100MM BR C/ 6M', codigoBarras: '17898527884902', codigoInterno: '0303210008' },
  { codigoCatalogo: '35.323', descricao: 'TUBO ESG 75MM BR C/ 6M', codigoBarras: '7897613301081', codigoInterno: '11030904' },
  { codigoCatalogo: '37.512', descricao: 'TUBO ESG 75MM BR C/ 6M', codigoBarras: '7898935215032', codigoInterno: '01010103' },
  { codigoCatalogo: '31.500', descricao: 'TUBO ESG 50MM BR C/ 6M', codigoBarras: '7898527884882', codigoInterno: '0303210005' },
  { codigoCatalogo: '21.031', descricao: 'TUBO ESG 50MM BR C/ 6M', codigoBarras: '7898543590705', codigoInterno: '11000501' },
  { codigoCatalogo: '37.511', descricao: 'TUBO ESG 50MM BR C/ 6M', codigoBarras: '7898935215025', codigoInterno: '01010102' },
  { codigoCatalogo: '37.510', descricao: 'TUBO ESG 40MM BR C/ 6M', codigoBarras: '7898935215018', codigoInterno: '01010101' },
  { codigoCatalogo: '21.030', descricao: 'TUBO ESG 40MM BR C/ 6M', codigoBarras: '7898543590699', codigoInterno: '11000401' },
  { codigoCatalogo: '31.114', descricao: 'TRELICA H08 LEVE 5 X 3.4 X 3.4MM 6M', codigoBarras: '7900088137755', codigoInterno: '381610024' },
];

const normalizeText = (value: unknown): string => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
};

const onlyDigits = (value: unknown): string => {
  return String(value || '').replace(/\D/g, '');
};

const normalizeCode = (value: unknown): string => {
  return String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9.]/g, '');
};

const normalizedReferences = PERFIL_6M_REFERENCIAS.map((ref) => ({
  ref,
  descricaoNormalizada: normalizeText(ref.descricao),
  codigoBarrasDigitos: onlyDigits(ref.codigoBarras),
  codigoCatalogoNormalizado: normalizeCode(ref.codigoCatalogo),
  codigoInternoNormalizado: normalizeCode(ref.codigoInterno),
}));

export function findPerfil6mMatch(item: Perfil6mItemLookup): Perfil6mMatchResult {
  const codigoBarrasDigitos = onlyDigits(item.codigoBarras);
  if (codigoBarrasDigitos) {
    const byCodigoBarras = normalizedReferences.find(
      (entry) => entry.codigoBarrasDigitos === codigoBarrasDigitos
    );
    if (byCodigoBarras) {
      return {
        match: true,
        referencia: byCodigoBarras.ref,
        matchBy: 'codigo_barras',
      };
    }
  }

  const codigoOriginalNormalizado = normalizeCode(item.codigoOriginal);
  if (codigoOriginalNormalizado) {
    const byCodigoOriginal = normalizedReferences.find((entry) => {
      return (
        entry.codigoCatalogoNormalizado === codigoOriginalNormalizado ||
        entry.codigoInternoNormalizado === codigoOriginalNormalizado
      );
    });
    if (byCodigoOriginal) {
      return {
        match: true,
        referencia: byCodigoOriginal.ref,
        matchBy: 'codigo_original',
      };
    }
  }

  const nomeNormalizado = normalizeText(item.produtoNome);
  if (nomeNormalizado) {
    const byDescricao = normalizedReferences.find((entry) => {
      return (
        nomeNormalizado.includes(entry.descricaoNormalizada) ||
        entry.descricaoNormalizada.includes(nomeNormalizado)
      );
    });
    if (byDescricao) {
      return {
        match: true,
        referencia: byDescricao.ref,
        matchBy: 'descricao',
      };
    }
  }

  return {
    match: false,
    referencia: null,
    matchBy: null,
  };
}
