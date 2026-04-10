const SSW_API_BASE_URL = 'https://ssw.inf.br/api';

const SSW_DOMAIN = process.env.SSW_ACCERT_DOMAIN || '';
const SSW_USERNAME = process.env.SSW_ACCERT_USERNAME || '';
const SSW_PASSWORD = process.env.SSW_ACCERT_PASSWORD || '';
const SSW_CNPJ_EDI = process.env.SSW_ACCERT_CNPJ_EDI || '';

type GenerateTokenResponse = {
  sucess: boolean;
  date_time?: string;
  domain?: string;
  username?: string;
  token?: string;
  validity?: string;
  message?: string;
};

type SswGenericResponse = {
  erro?: boolean;
  mensagem?: string;
  [key: string]: unknown;
};

type TrackingDanfeResponse = {
  erro?: boolean;
  mensagem?: string;
  [key: string]: unknown;
};

let cachedToken: string | null = null;
let cachedTokenExpiresAtMs = 0;

function parseValidityToMs(validity: unknown): number {
  if (!validity || typeof validity !== 'string') return 6 * 60 * 60 * 1000;
  const parts = validity.split(':').map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return 6 * 60 * 60 * 1000;
  const [hh, mm, ss] = parts;
  return (hh * 60 * 60 + mm * 60 + ss) * 1000;
}

function requireConfig(needsPassword = false) {
  if (!SSW_DOMAIN || !SSW_USERNAME || !SSW_CNPJ_EDI) {
    throw new Error('Credenciais básicas do SSW não configuradas (SSW_ACCERT_DOMAIN, USERNAME, CNPJ_EDI)');
  }
  if (needsPassword && !SSW_PASSWORD) {
    throw new Error('Senha do SSW não configurada (SSW_ACCERT_PASSWORD) - necessária para esta rota.');
  }
}

export async function getSswToken(force = false): Promise<string> {
  requireConfig(true);

  const now = Date.now();
  if (!force && cachedToken && now < cachedTokenExpiresAtMs) {
    return cachedToken;
  }

  const response = await fetch(`${SSW_API_BASE_URL}/generateToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      domain: SSW_DOMAIN,
      username: SSW_USERNAME,
      password: SSW_PASSWORD,
      cnpj_edi: SSW_CNPJ_EDI,
      force,
    }),
  });

  const data: GenerateTokenResponse | null = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof data?.message === 'string'
        ? data.message
        : `Falha ao gerar token SSW (${response.status})`;
    throw new Error(message);
  }

  const success = data?.sucess;
  const token = data?.token;

  if (success !== true || typeof token !== 'string' || !token.trim()) {
    const message = typeof data?.message === 'string' ? data.message : 'Falha ao gerar token SSW';
    throw new Error(message);
  }

  const validityMs = parseValidityToMs(data?.validity);
  cachedToken = token;
  cachedTokenExpiresAtMs = Date.now() + Math.max(0, validityMs - 5 * 60 * 1000);

  return token;
}

async function sswGet(endpointPath: string, query: Record<string, string>): Promise<SswGenericResponse> {
  const token = await getSswToken(false);
  const url = new URL(`${SSW_API_BASE_URL}${endpointPath}`);
  for (const [k, v] of Object.entries(query)) {
    if (v) url.searchParams.set(k, v);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
  });

  const data: SswGenericResponse | null = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Falha ao consultar SSW (${response.status})`);
  }

  if (!data) {
    throw new Error('Resposta inválida do SSW');
  }

  return data;
}

async function sswPostJson(endpointPath: string, payload: unknown): Promise<SswGenericResponse> {
  const token = await getSswToken(false);
  const response = await fetch(`${SSW_API_BASE_URL}${endpointPath}`, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data: SswGenericResponse | null = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Falha ao consultar SSW (${response.status})`);
  }

  if (!data) {
    throw new Error('Resposta inválida do SSW');
  }

  return data;
}

export async function consultaClientes(idCliente: string): Promise<SswGenericResponse> {
  return sswGet('/consultaGenerica/consultaClientes', { idCliente });
}

export async function consultaCep(idCep: string): Promise<SswGenericResponse> {
  return sswGet('/consultaGenerica/consultaCep', { idCep });
}

export async function consultaPrazo(params: {
  idCepRemetente: string;
  idCepDestinatario: string;
  idClienteRemetente?: string;
  idClienteDestinatario?: string;
  idClientePagador?: string;
  tpFrete?: string;
  idCodigoMercadoria?: string;
}): Promise<SswGenericResponse> {
  return sswGet('/consultaGenerica/consultaPrazo', {
    idCepRemetente: params.idCepRemetente,
    idCepDestinatario: params.idCepDestinatario,
    idClienteRemetente: params.idClienteRemetente || '',
    idClienteDestinatario: params.idClienteDestinatario || '',
    idClientePagador: params.idClientePagador || '',
    tpFrete: params.tpFrete || '',
    idCodigoMercadoria: params.idCodigoMercadoria || '',
  });
}

export async function trackingDanfe(chaveNfe: string): Promise<TrackingDanfeResponse> {
  requireConfig();
  
  const response = await fetch(`${SSW_API_BASE_URL}/tracking`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      cnpj: SSW_CNPJ_EDI,
      senha: SSW_PASSWORD,
      chave_nfe: chaveNfe,
    }),
  });

  const data: TrackingDanfeResponse | null = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Falha ao consultar tracking SSW (${response.status})`);
  }

  if (!data) {
    throw new Error('Resposta inválida do tracking SSW');
  }

  return data;
}
