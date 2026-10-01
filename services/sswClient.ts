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
    console.log(`[ SSW ] Usando token cache (expira em ${new Date(cachedTokenExpiresAtMs).toLocaleTimeString()})`);
    return cachedToken;
  }

  console.log(`[ SSW ] Gerando novo token (force=${force})`);
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

  console.log(`[ SSW ] Token gerado com sucesso. Válido por ${validityMs/1000/60} minutos`);

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

  console.log(`[ SSW ] Consultando tracking para chave: ${chaveNfe.substring(0,20)}...`);

  const response = await fetch(`${SSW_API_BASE_URL}/trackingdanfe`, {
    method: 'POST',
    headers: {
      Authorization: await getSswToken(false),
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      chave_nfe: chaveNfe,
    }),
  });

  const textResponse = await response.text();
  let data: TrackingDanfeResponse | null = null;

  try {
    data = JSON.parse(textResponse) as TrackingDanfeResponse;
  } catch (e) {
    console.error(`[ SSW ] Falha ao parsear JSON:`, textResponse.substring(0, 200));
    throw new Error('Resposta inválida da API SSW (não é JSON válido)');
  }

  console.log(`[ SSW ] Resposta HTTP: ${response.status}`);
  console.log(`[ SSW ] Corpo da resposta:`, JSON.stringify(data));

  if (!response.ok) {
    throw new Error(`Falha ao consultar tracking SSW (${response.status}): ${textResponse.substring(0, 100)}`);
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Resposta inválida do tracking SSW');
  }

  return data;
}

type NotaFiscalResponse = {
  erro?: boolean;
  mensagem?: string;
  [key: string]: unknown;
};

// Função para consultar nota fiscal por identificação NFE
// Credenciais da API externa (para consultar notas fiscais específicas)
const EXTERNAL_API_BASE_URL = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';
const EXTERNAL_API_USERNAME = process.env.API_EXTERNA_USERNAME || 'erp@santri.com.br';
const EXTERNAL_API_PASSWORD = process.env.API_EXTERNA_PASSWORD || 'PASSkey@2025';

let cachedSantriToken: string | null = null;
let cachedSantriTokenExpiresAtMs = 0;

async function getExternalToken(): Promise<string> {
  const now = Date.now();
  if (cachedSantriToken && now < cachedSantriTokenExpiresAtMs) {
    return cachedSantriToken;
  }

  const formData = new URLSearchParams();
  formData.append('username', EXTERNAL_API_USERNAME);
  formData.append('password', EXTERNAL_API_PASSWORD);

  const response = await fetch(`${EXTERNAL_API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error(`Falha na autenticação com a API externa (${response.status})`);
  }

  const data = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  const token = typeof data?.access_token === 'string' ? data.access_token : '';

  if (!token) {
    throw new Error('Token inválido retornado pela API externa');
  }

  // Cache do token por 1 hora (assumindo que tokens duram mais que isso)
  cachedSantriToken = token;
  cachedSantriTokenExpiresAtMs = Date.now() + (60 * 60 * 1000); // 1 hora

  return token;
}

export async function consultarNotaFiscal(identificacaoNfe: string): Promise<NotaFiscalResponse> {
  if (!identificacaoNfe || typeof identificacaoNfe !== 'string' || identificacaoNfe.length !== 44) {
    throw new Error('Identificação NFE inválida. Deve ter 44 caracteres.');
  }

  // Usar as credenciais corretas da API externa
  const token = await getExternalToken();

  // Endpoint fornecido pelo usuário
  const externalApiUrl = `${EXTERNAL_API_BASE_URL}/api/v1/notas-fiscais/identificacao-nfe`;

  const response = await fetch(`${externalApiUrl}/${identificacaoNfe}`, {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  const data: NotaFiscalResponse | null = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Falha ao consultar nota fiscal (${response.status}): ${data?.mensagem || 'Erro desconhecido'}`);
  }

  if (!data) {
    throw new Error('Resposta inválida da API de notas fiscais');
  }

  return data;
}

// Função para buscar chave NFE por ORCAMENTO_ID
// Implementação baseada nas informações do usuário sobre ligação entre ORCAMENTO_ID e chave NFE
export async function buscarChaveNfePorOrcamento(orcamentoId: number, pedidoInfo?: any): Promise<string | null> {
  try {
    console.log(`🔍 Buscando chave NFE real para ORCAMENTO_ID: ${orcamentoId}`);

    // Estratégia 1: Tentar padrões específicos da empresa
    if (pedidoInfo) {
      const chavePorPadrao = await tentarEncontrarChavePorPadrao(
        orcamentoId,
        pedidoInfo.CADASTRO_ID,
        new Date(pedidoInfo.DATA_HORA_CADASTRO)
      );

      if (chavePorPadrao) {
        console.log(`✅ Chave NFE encontrada por padrão específico: ${chavePorPadrao}`);
        return chavePorPadrao;
      }
    }

    // Estratégia 2: Se temos informações do pedido (cliente, data), buscar notas do cliente no período
    if (pedidoInfo?.CADASTRO_ID && pedidoInfo?.DATA_HORA_CADASTRO) {
      try {
        const dataPedido = new Date(pedidoInfo.DATA_HORA_CADASTRO);
        const dataInicio = new Date(dataPedido);
        dataInicio.setDate(dataInicio.getDate() - 1); // 1 dia antes
        const dataFim = new Date(dataPedido);
        dataFim.setDate(dataFim.getDate() + 7); // 1 semana depois

        // Buscar notas fiscais do cliente no período com informações do pedido para match
        const chaveEncontrada = await buscarNotasPorClientePeriodo(
          pedidoInfo.CADASTRO_ID,
          dataInicio.toISOString().split('T')[0],
          dataFim.toISOString().split('T')[0],
          pedidoInfo.ORCAMENTO_ID,
          pedidoInfo.NUMERO_NOTA
        );

        if (chaveEncontrada) {
          console.log(`✅ Chave NFE encontrada via busca por cliente com match: ${chaveEncontrada}`);
          return chaveEncontrada;
        }
      } catch (clienteError: any) {
        console.log(`Busca por cliente falhou: ${clienteError.message}`);
      }
    }

    console.log(`❌ Não foi possível encontrar chave NFE real para ORCAMENTO_ID: ${orcamentoId}`);
    return null;

  } catch (error) {
    console.error('Erro ao buscar chave NFE por orçamento:', error);
    return null;
  }
}

// Função auxiliar para buscar notas fiscais por cliente e período
// AGORA: busca TODAS as notas do período e Faz match por ORCAMENTO_ID ou NUMERO_NOTA
async function buscarNotasPorClientePeriodo(clienteId: number, dataInicio: string, dataFim: string, orcamentoId?: number, numeroNota?: string): Promise<string | null> {
  try {
    console.log(`🔍 Buscando notas fiscais do cliente ${clienteId} entre ${dataInicio} e ${dataFim} (orcamento_id=${orcamentoId}, numero_nota=${numeroNota})`);

    // Usar a API interna de notas fiscais que retorna ORCAMENTO_ID
    const response = await fetch(`/api/notas-fiscais?data_inicio=${dataInicio}&data_fim=${dataFim}&limit=100`);

    if (!response.ok) {
      console.log(`⚠️ API de notas fiscais retornou ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // A API retorna { data: NotaFiscal[], total: number }
    const notas = data.data || [];
    console.log(`📄 Notas fiscais encontradas no período: ${notas.length}`);

    // Tentar encontrar por ORCAMENTO_ID primeiro (mais preciso)
    if (orcamentoId) {
      const notaPorOrcamento = notas.find((n: any) => n.ORCAMENTO_ID === orcamentoId || n.ORCAMENTO_BASE_ID === orcamentoId);
      if (notaPorOrcamento?.IDENTIFICACAO_NFE) {
        console.log(`✅ Nota encontrada por ORCAMENTO_ID ${orcamentoId}: ${notaPorOrcamento.IDENTIFICACAO_NFE.substring(0,20)}...`);
        return notaPorOrcamento.IDENTIFICACAO_NFE;
      }
    }

    // Tentar encontrar por NUMERO_NOTA
    if (numeroNota) {
      const notaPorNumero = notas.find((n: any) => 
        n.NUMERO_NOTA === numeroNota || 
        n.NUMERO_NOTA_FISCAL === numeroNota ||
        n.numero_nota === numeroNota
      );
      if (notaPorNumero?.IDENTIFICACAO_NFE) {
        console.log(`✅ Nota encontrada por NUMERO_NOTA ${numeroNota}: ${notaPorNumero.IDENTIFICACAO_NFE.substring(0,20)}...`);
        return notaPorNumero.IDENTIFICACAO_NFE;
      }
    }

    // Se tem clienteId, tentar a primeira nota do cliente (fallback)
    if (clienteId) {
      const notaDoCliente = notas.find((n: any) => n.CADASTRO_ID === clienteId || n.CADASTRO_ID === String(clienteId));
      if (notaDoCliente?.IDENTIFICACAO_NFE) {
        console.log(`⚠️ Usando primeira nota do cliente ${clienteId}: ${notaDoCliente.IDENTIFICACAO_NFE.substring(0,20)}...`);
        return notaDoCliente.IDENTIFICACAO_NFE;
      }
    }

    console.log(`❌ Nenhuma nota fiscal encontrada para os critérios fornecidos`);
    return null;

  } catch (error) {
    console.error('Erro ao buscar notas por cliente:', error);
    return null;
  }
}

// Função para tentar encontrar chave NFE por padrões específicos da empresa
// Esta função pode ser ajustada conforme os padrões de geração de chave da empresa
export async function tentarEncontrarChavePorPadrao(orcamentoId: number, clienteId: number, dataPedido: Date): Promise<string | null> {
  try {
    // Esta é uma implementação placeholder
    // Cada empresa tem seu próprio padrão para gerar chaves NFE

    // Exemplo de possíveis padrões:
    // 1. Baseado em ORCAMENTO_ID + data + cliente
    // 2. Consulta em base de dados interna
    // 3. Algoritmo específico da empresa

    console.log(`Tentando padrões específicos para ORCAMENTO_ID ${orcamentoId}, cliente ${clienteId}, data ${dataPedido.toISOString()}`);

    // Placeholder - retornar null até implementar lógica específica
    return null;

  } catch (error) {
    console.error('Erro ao tentar encontrar chave por padrão:', error);
    return null;
  }
}
