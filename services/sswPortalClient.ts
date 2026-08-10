import { createHmac, timingSafeEqual } from 'crypto';

const PORTAL_BASE_URL = 'https://sistema.ssw.inf.br';

type SswPortalAccountKey = 'ACCERT' | 'EXPRESSO_GOIAS' | 'ZANUELLO';

type SswPortalAccount = {
  key: SswPortalAccountKey;
  label: string;
  domain: string;
  username: string;
  password: string;
};

const SSW_PORTAL_ACCOUNTS: SswPortalAccount[] = [
  {
    key: 'ACCERT',
    label: 'ACCERT',
    domain: process.env.SSW_ACCERT_DOMAIN || '',
    username: process.env.SSW_ACCERT_USERNAME || '',
    password: process.env.SSW_ACCERT_PASSWORD || '',
  },
  {
    key: 'EXPRESSO_GOIAS',
    label: 'Expresso Goias',
    domain: process.env.SSW_EXPRESSO_GOIAS_DOMAIN || '',
    username: process.env.SSW_EXPRESSO_GOIAS_USERNAME || '',
    password: process.env.SSW_EXPRESSO_GOIAS_PASSWORD || '',
  },
  {
    key: 'ZANUELLO',
    label: 'Zanuello',
    domain: process.env.SSW_ZANUELLO_DOMAIN || '',
    username: process.env.SSW_ZANUELLO_USERNAME || '',
    password: process.env.SSW_ZANUELLO_PASSWORD || '',
  },
];

type PortalEvent = {
  data_hora: string;
  data_hora_efetiva: string;
  dominio: string;
  filial: string;
  cidade: string;
  ocorrencia: string;
  descricao: string;
  tipo: string;
  usuario?: string;
  detalhe?: string;
  documentos?: string;
  imagem?: string;
  imagem_url?: string;
  ocorrencia_ssw?: string;
  conferentes?: string;
  source: 'ssw_portal';
};

export type SswPortalTracking = {
  success: boolean;
  message: string;
  documento?: {
    header: Record<string, unknown>;
    tracking: PortalEvent[];
  };
};

type PortalSession = { cookies: Map<string, string>; expiresAt: number };

const sessions = new Map<SswPortalAccountKey, PortalSession>();
const loginPromises = new Map<SswPortalAccountKey, Promise<PortalSession>>();
const requestQueues = new Map<SswPortalAccountKey, Promise<unknown>>();

function getConfiguredAccounts(): SswPortalAccount[] {
  return SSW_PORTAL_ACCOUNTS.filter((account) => account.domain && account.username && account.password);
}

function normalizeTransportadoraName(value: unknown): string {
  const normalized = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();

  if (!normalized) return '';
  if (normalized.includes('EXPRESSO') && normalized.includes('GOIAS')) return 'EXPRESSO_GOIAS';
  if (normalized.includes('ZANUELLO') || normalized.includes('ZANUELO')) return 'ZANUELLO';
  if (normalized.includes('ACCERT') || normalized === 'ACERT') return 'ACCERT';
  return normalized;
}

function getAccountByKey(key: string | null | undefined): SswPortalAccount | null {
  if (!key) return null;
  return SSW_PORTAL_ACCOUNTS.find((account) => account.key === key) ?? null;
}

function getPreferredAccounts(transportadora?: string | null): SswPortalAccount[] {
  const configured = getConfiguredAccounts();
  const preferred = getAccountByKey(normalizeTransportadoraName(transportadora));

  if (!preferred) return configured;
  if (!preferred.domain || !preferred.username || !preferred.password) return configured;

  // Quando a transportadora foi identificada, a NF deve ser consultada somente
  // na conta dela. O fallback fazia o erro citar a última conta tentada (por
  // exemplo, Zanuello para uma entrega da ACCERT) e podia associar uma NF
  // homônima de outra transportadora.
  return [preferred];
}

function getRequestQueue(accountKey: SswPortalAccountKey): Promise<unknown> {
  return requestQueues.get(accountKey) ?? Promise.resolve();
}

function setRequestQueue(accountKey: SswPortalAccountKey, promise: Promise<unknown>) {
  requestQueues.set(accountKey, promise.catch(() => undefined));
}

function decodeHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function cookieHeader(cookies: Map<string, string>): string {
  return Array.from(cookies, ([key, value]) => `${key}=${value}`).join('; ');
}

function collectCookies(headers: Headers, cookies: Map<string, string>) {
  const values = typeof headers.getSetCookie === 'function'
    ? headers.getSetCookie()
    : [headers.get('set-cookie')].filter((value): value is string => !!value);

  for (const raw of values) {
    const match = raw.match(/^\s*([^=;,]+)=([^;]*)/);
    if (match?.[1]) cookies.set(match[1], match[2] ?? '');
  }
}

async function portalRequest(
  path: string,
  cookies: Map<string, string>,
  body?: string
): Promise<string> {
  const response = await fetch(`${PORTAL_BASE_URL}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
      ...(body === undefined ? {} : { 'content-type': 'application/x-www-form-urlencoded' }),
      ...(body === undefined ? {} : {
        origin: PORTAL_BASE_URL,
        referer: `${PORTAL_BASE_URL}${path}`,
        'x-requested-with': 'XMLHttpRequest',
      }),
      ...(cookies.size ? { cookie: cookieHeader(cookies) } : {}),
    },
    body,
    cache: 'no-store',
  });

  collectCookies(response.headers, cookies);
  const html = await response.text();
  if (!response.ok) throw new Error(`Falha ao consultar portal SSW (${response.status})`);
  return html;
}

async function login(account: SswPortalAccount): Promise<PortalSession> {
  if (!account.domain || !account.username || !account.password) {
    throw new Error(`Credenciais do portal SSW nao configuradas para ${account.label}`);
  }

  const cookies = new Map<string, string>();
  const loginHtml = await portalRequest('/bin/ssw0422', cookies);
  const backImage = loginHtml.match(/name=backimg\s+id=backimg\s+value="([^"]*)"/i)?.[1] ?? '';
  const body = [
    'act=L',
    `f1=${encodeURIComponent(account.domain)}`,
    `f3=${encodeURIComponent(account.username)}`,
    `f4=${encodeURIComponent(account.password)}`,
    'f6=TRUE',
    `backimg=${backImage}`,
    `dummy=${Date.now()}`,
  ].join('&');

  const result = await portalRequest('/bin/ssw0422', cookies, body);
  if (!result.includes('frmlogin') || !cookies.get('token')) {
    throw new Error(`Falha na autenticacao do portal SSW para ${account.label}`);
  }

  await portalRequest('/bin/menu01', cookies, 'act=');
  await portalRequest('/bin/menu01', cookies, `act=TRO&f2=&f3=101&dummy=${Date.now()}`);
  await portalRequest('/bin/ssw0053', cookies, `sequencia=101&dummy=${Date.now()}`);

  return { cookies, expiresAt: Date.now() + 20 * 60 * 1000 };
}

async function getSession(account: SswPortalAccount, force = false): Promise<PortalSession> {
  const session = sessions.get(account.key) ?? null;
  if (!force && session && session.expiresAt > Date.now()) return session;

  let loginPromise = loginPromises.get(account.key) ?? null;
  if (!loginPromise) {
    loginPromise = login(account).then((value) => {
      sessions.set(account.key, value);
      return value;
    }).finally(() => {
      loginPromises.delete(account.key);
    });
    loginPromises.set(account.key, loginPromise);
  }

  return loginPromise;
}

function formatPortalDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}

function parsePortalDate(value: string): string {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return value;
  const [, day, month, year, hour, minute] = match;
  return `20${year}-${month}-${day}T${hour}:${minute}:00-03:00`;
}

function hidden(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.match(new RegExp(`name=["']?${escaped}["']?[^>]*value=["']([^"']*)`, 'i'))?.[1] ?? '';
}

function photoSignature(token: string, account: SswPortalAccount): string {
  return createHmac('sha256', account.password).update(token).digest('base64url');
}

function createPortalPhotoUrl(reference: string, account: SswPortalAccount): string {
  const token = Buffer.from(JSON.stringify({
    accountKey: account.key,
    reference,
    expiresAt: Date.now() + 60 * 60 * 1000,
  })).toString('base64url');
  return `/api/ssw_accert/public-ssw-photo?token=${encodeURIComponent(token)}&signature=${encodeURIComponent(photoSignature(token, account))}`;
}

function parseOccurrenceRows(html: string, account: SswPortalAccount, seqCtrc: string): PortalEvent[] {
  const imageRefByDate = new Map<string, string>();
  const proofRefByDate = new Map<string, string>();
  for (const row of Array.from(html.matchAll(/<r>([\s\S]*?)<\/r>/gi))) {
    const date = row[1].match(/<f0>([\s\S]*?)<\/f0>/i)?.[1];
    const rawProof = row[1].match(/<f8>([\s\S]*?)<\/f8>/i)?.[1]
      ?.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
    const rawImage = row[1].match(/<f9>([\s\S]*?)<\/f9>/i)?.[1]
      ?.replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
    const imageRef = rawImage?.match(/ajaxEnvia\('',1,'([^']+)'/i)?.[1];
    const occurrenceText = decodeHtml(
      [
        row[1].match(/<f5>([\s\S]*?)<\/f5>/i)?.[1],
        row[1].match(/<f6>([\s\S]*?)<\/f6>/i)?.[1],
      ].filter(Boolean).join(' ')
    ).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isDeliveryProof = /\b(entregue|entrega realizada|mercadoria entregue|comprovante de entrega)\b/.test(occurrenceText);
    if (date && imageRef) imageRefByDate.set(decodeHtml(date), imageRef);
    if (
      date &&
      (/ajaxEnvia\(['"]COM['"],\s*1/i.test(rawProof ?? '') || (isDeliveryProof && !!imageRef))
    ) {
      proofRefByDate.set(decodeHtml(date), `ssw0053?act=COM&seq_ctrc=${encodeURIComponent(seqCtrc)}`);
    }
  }
  const xmlRows = Array.from(html.matchAll(/<r>([\s\S]*?)<\/r>/gi)).map((row) => {
    const cells: string[] = [];
    for (const field of Array.from(row[1].matchAll(/<f(\d+)>([\s\S]*?)<\/f\1>/gi))) {
      const userValue = field[2].match(/#u#([^|#]+)/)?.[1];
      const decodedMarkup = field[2]
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/<!--([\s\S]*?)-->/g, '');
      const detailValue = decodedMarkup.match(/showmsg\('([^']+)/i)?.[1];
      cells[Number(field[1])] = userValue || decodeHtml(
        (detailValue || decodedMarkup).replace(/#u#[\s\S]*?#\/u#/g, '')
      );
    }
    return cells;
  });
  const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
  const parsedRows = [...xmlRows, ...rows.map((row) =>
    Array.from(row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((cell) => decodeHtml(cell[1]))
  )];

  if (!parsedRows.some((cells) => /^\d{2}\/\d{2}\/\d{2}/.test(cells[0] ?? ''))) {
    const values = Array.from(
      html.matchAll(/<div[^>]*class=["']?(?:srdvl-b|srdvl|srdvr)["']?[^>]*>([\s\S]*?)<\/div>/gi)
    ).map((match) => decodeHtml(match[1]));
    for (let index = 0; index < values.length; index += 1) {
      if (/^\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(values[index] ?? '')) {
        parsedRows.push(values.slice(index, index + 12));
        index += 11;
      }
    }
  }

  return parsedRows.flatMap((cells) => {
    if (cells.length < 7 || !/^\d{2}\/\d{2}\/\d{2}/.test(cells[0] ?? '')) return [];
    const date = parsePortalDate(cells[0]);
    return [{
      data_hora: date,
      data_hora_efetiva: date,
      dominio: cells[1] ?? '',
      filial: cells[2] ?? '',
      cidade: '',
      usuario: cells[4] ?? '',
      ocorrencia: cells[5] ?? '',
      descricao: cells[6] ?? '',
      tipo: /recusa|avaria|devolu|cancelad|nao entreg/i.test(`${cells[5]} ${cells[6]}`) ? 'Problema' : 'Informativo',
      detalhe: cells[7] ?? '',
      documentos: cells[8] ?? '',
      imagem: cells[9] ?? '',
      imagem_url: proofRefByDate.has(cells[0])
        ? createPortalPhotoUrl(proofRefByDate.get(cells[0])!, account)
        : imageRefByDate.has(cells[0])
          ? createPortalPhotoUrl(imageRefByDate.get(cells[0])!, account)
          : undefined,
      ocorrencia_ssw: cells[10] ?? '',
      conferentes: cells[11] ?? '',
      source: 'ssw_portal' as const,
    }];
  });
}

function validatePhotoToken(token: string, signature: string): { account: SswPortalAccount; reference: string } {
  const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8')) as {
    accountKey?: unknown;
    reference?: unknown;
    expiresAt?: unknown;
  };

  const configuredAccounts = getConfiguredAccounts();
  const explicitAccount = getAccountByKey(typeof payload.accountKey === 'string' ? payload.accountKey : null);
  const receivedBuffer = Buffer.from(signature);

  const candidateAccounts = explicitAccount
    ? [explicitAccount]
    : configuredAccounts;

  const account = candidateAccounts.find((candidate) => {
    const expected = photoSignature(token, candidate);
    const expectedBuffer = Buffer.from(expected);
    return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
  });

  if (!account) {
    throw new Error('Link de imagem invalido');
  }

  if (typeof payload.expiresAt !== 'number' || payload.expiresAt < Date.now()) {
    throw new Error('Link de imagem expirado');
  }

  const reference = typeof payload.reference === 'string' ? payload.reference : '';
  if (!/^ssw(?:0053|0122)\?/.test(reference) || /(?:^|[?&])(?:f[1-4]|password|token)=/i.test(reference)) {
    throw new Error('Referencia de imagem invalida');
  }

  return { account, reference };
}

export async function fetchPortalPhoto(token: string, signature: string): Promise<Response> {
  const { account, reference } = validatePhotoToken(token, signature);
  const [program, query = ''] = reference.split('?', 2);

  const fetchWithSession = async (currentSession: PortalSession) => {
    const requestData = `${query}${query ? '&' : ''}dummy=${Date.now()}`;
    const requestPhoto = async (url: string, method: 'GET' | 'POST' = 'POST') => {
      const photoResponse = await fetch(url, {
        method,
        headers: {
          ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
          cookie: cookieHeader(currentSession.cookies),
          referer: `${PORTAL_BASE_URL}/bin/ssw0053`,
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
        },
        ...(method === 'POST' ? { body: requestData } : {}),
        cache: 'no-store',
        redirect: 'follow',
      });
      collectCookies(photoResponse.headers, currentSession.cookies);
      return {
        response: photoResponse,
        contentType: photoResponse.headers.get('content-type') || 'application/octet-stream',
        body: await photoResponse.arrayBuffer(),
      };
    };

    let { response, contentType, body } = await requestPhoto(`${PORTAL_BASE_URL}/bin/${program}`);

    const isLoadingPlaceholder = (candidateBody: ArrayBuffer, candidateContentType: string) => {
      const bytes = new Uint8Array(candidateBody);
      return program.toLowerCase() === 'ssw0122'
        && candidateContentType.toLowerCase().includes('image/png')
        && bytes.length < 2000
        && bytes[16] === 0 && bytes[17] === 0 && bytes[18] === 0 && bytes[19] === 125
        && bytes[20] === 0 && bytes[21] === 0 && bytes[22] === 0 && bytes[23] === 18;
    };

    if (isLoadingPlaceholder(body, contentType)) {
      const photoRequests: Array<{ url: string; method: 'GET' | 'POST' }> = [
        { url: `https://www.ssw.inf.br/cgi-local/${program}`, method: 'POST' },
        { url: `${PORTAL_BASE_URL}/bin/${program}`, method: 'POST' },
        { url: `${PORTAL_BASE_URL}/bin/${program}?${requestData}`, method: 'GET' },
        { url: `https://www.ssw.inf.br/cgi-local/${program}?${requestData}`, method: 'GET' },
      ];

      for (let attempt = 0; attempt < 5 && isLoadingPlaceholder(body, contentType); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 400 + attempt * 250));
        const request = photoRequests[attempt % photoRequests.length];
        ({ response, contentType, body } = await requestPhoto(request.url, request.method));
      }

      if (isLoadingPlaceholder(body, contentType)) {
        throw new Error('Imagem ainda nao disponibilizada pelo SSW');
      }
    }

    if (contentType.toLowerCase().includes('text/html')) {
      const html = Buffer.from(body).toString('latin1');
      const embeddedImage = html.match(/src\s*=\s*["']?data:(image\/[a-z0-9.+-]+);base64,([^"'\s>]+)/i);
      if (embeddedImage?.[1] && embeddedImage[2]) {
        return new Response(Buffer.from(embeddedImage[2], 'base64'), {
          status: 200,
          headers: { 'content-type': embeddedImage[1] },
        });
      }
      const imageSource = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i)?.[1]
        ?.replace(/&amp;/gi, '&');
      if (imageSource) {
        const remoteImage = new URL(imageSource, PORTAL_BASE_URL);
        if (!remoteImage.hostname.endsWith('ssw.inf.br')) {
          throw new Error('Endereco da imagem do SSW invalido');
        }
        const imageResponse = await fetch(remoteImage, {
          headers: {
            cookie: cookieHeader(currentSession.cookies),
            referer: `${PORTAL_BASE_URL}/bin/${program}`,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
          },
          cache: 'no-store',
        });
        return new Response(await imageResponse.arrayBuffer(), {
          status: imageResponse.status,
          headers: { 'content-type': imageResponse.headers.get('content-type') || 'image/jpeg' },
        });
      }
      throw new Error('Sessao expirada ou imagem nao localizada no SSW');
    }

    return new Response(body, { status: response.status, headers: { 'content-type': contentType } });
  };

  const execute = async () => {
    try {
      return await fetchWithSession(await getSession(account));
    } catch {
      return fetchWithSession(await getSession(account, true));
    }
  };

  const queued = getRequestQueue(account.key).then(execute, execute);
  setRequestQueue(account.key, queued);
  return queued;
}

async function queryWithSession(
  numeroNota: string,
  currentSession: PortalSession,
  account: SswPortalAccount
): Promise<SswPortalTracking> {
  const now = new Date();
  const start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const queryBody = [
    'act=P2',
    `t_nro_nf=${encodeURIComponent(numeroNota)}`,
    `t_data_ini=${formatPortalDate(start)}`,
    `t_data_fin=${formatPortalDate(now)}`,
    'dd_f_t_data_ini=', 'dd_f_t_data_fin=', 'dd_f_t_ser_ctrc=', 'dd_f_t_ser_nf=',
    'dd_f_t_nro_pedido=', 'data_ini_inf=30%2F12%2F99', 'data_fin_inf=30%2F12%2F99',
    'seq_ctrc=0', 'local=', 'FAMILIA=', `dummy=${Date.now()}`,
  ].join('&');

  const detailHtml = await portalRequest('/bin/ssw0053', currentSession.cookies, queryBody);
  const seqCtrc = hidden(detailHtml, 'seq_ctrc');
  if (!seqCtrc || seqCtrc === '0' || !detailHtml.includes('link_ocor')) {
    return { success: false, message: `Nota fiscal nao localizada na Situacao do CTRC em ${account.label}` };
  }

  const occurrenceBody = [
    'act=O', 'aviso_resgate=%23aviso_resgate%23', 'dd_f_t_data_ini=', 'dd_f_t_data_fin=',
    'dd_f_t_ser_ctrc=', 'dd_f_t_ser_nf=', 'dd_f_t_nro_pedido=', 'g_ctrc_ser_ctrc=',
    'g_ctrc_nro_ctrc=0', `gw_nro_nf_ini=${encodeURIComponent(numeroNota)}`, 'g_ctrc_nf_vol_ini=0',
    'gw_ctrc_nr_sscc=', 'g_ctrc_nro_ctl_form=0', 'gw_ctrc_parc_nro_ctrc_parc=0',
    'g_ctrc_c_chave_fis=', 'gw_gaiola_codigo=0', 'gw_pallet_codigo=0',
    `local=${encodeURIComponent(hidden(detailHtml, 'local') || 'Q')}`,
    `data_ini_inf=${encodeURIComponent(hidden(detailHtml, 'data_ini_inf'))}`,
    `data_fin_inf=${encodeURIComponent(hidden(detailHtml, 'data_fin_inf'))}`,
    `seq_ctrc=${encodeURIComponent(seqCtrc)}`,
    `FAMILIA=${encodeURIComponent(hidden(detailHtml, 'FAMILIA') || account.domain)}`,
    `dummy=${Date.now()}`,
  ].join('&');

  const occurrencesHtml = await portalRequest('/bin/ssw0053', currentSession.cookies, occurrenceBody);
  const events = parseOccurrenceRows(occurrencesHtml, account, seqCtrc);
  return {
    success: true,
    message: `Ocorrencias consultadas na Situacao do CTRC em ${account.label}`,
    documento: {
      header: { nro_nf: numeroNota, seq_ctrc: seqCtrc, source: 'ssw_portal', transportadora: account.key },
      tracking: events,
    },
  };
}

export async function trackingPortalByNotaFiscal(
  numeroNota: string,
  transportadora?: string | null
): Promise<SswPortalTracking> {
  const normalized = numeroNota.replace(/\D/g, '');
  if (!normalized) throw new Error('Numero da nota fiscal invalido');

  const accounts = getPreferredAccounts(transportadora);
  if (!accounts.length) {
    throw new Error('Nenhuma credencial do portal SSW configurada');
  }

  let lastError: Error | null = null;

  for (const account of accounts) {
    const execute = async () => {
      let currentSession = await getSession(account);
      try {
        return await queryWithSession(normalized, currentSession, account);
      } catch {
        currentSession = await getSession(account, true);
        return queryWithSession(normalized, currentSession, account);
      }
    };

    try {
      const queued = getRequestQueue(account.key).then(execute, execute);
      setRequestQueue(account.key, queued);
      const result = await queued;
      if (result.success) return result;
      lastError = new Error(result.message);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(`Falha ao consultar ${account.label}`);
    }
  }

  throw lastError ?? new Error('Nao foi possivel localizar a nota nas transportadoras configuradas');
}
