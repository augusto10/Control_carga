import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../../services/api-externa';
import prisma from '@/lib/prisma';
import { createHash } from 'crypto';

const FULL_SCAN_CACHE_TTL_MS = 60_000;
const fullScanCache = new Map<string, { expiresAt: number; data: any[]; totalValor: number }>();
const FAST_QUERY_CACHE_TTL_MS = 120_000;
const FAST_QUERY_STALE_TTL_MS = 15 * 60_000;
const fastQueryCache = new Map<string, { expiresAt: number; staleAt: number; payload: any }>();
const PERSISTED_QUERY_CACHE_TTL_MS = 5 * 60_000;
const PERSISTED_QUERY_CACHE_STALE_MS = 60 * 60_000;
const MONTH_BASE_CACHE_TTL_MS = 10 * 60_000;
const MONTH_BASE_CACHE_STALE_MS = 24 * 60 * 60_000;
const MONTH_BASE_CACHE_KEY = 'pedidos_month_base:v2';
let monthBaseCache: { expiresAt: number; staleAt: number; data: any[] } | null = null;
let monthBaseRefreshPromise: Promise<any[]> | null = null;

type PersistedQueryCacheRow = {
  payload: any;
  expiresAt: Date;
  staleAt: Date;
};

const getPersistedCacheConfigKey = (cacheKey: string) => {
  const hash = createHash('sha1').update(cacheKey).digest('hex');
  return `pedidos_query_cache:${hash}`;
};

const readPersistedQueryCache = async (cacheKey: string) => {
  try {
    const cache = await prisma.configuracaoSistema.findUnique({
      where: { chave: getPersistedCacheConfigKey(cacheKey) }
    });

    if (!cache?.valor) return null;

    const parsed = JSON.parse(cache.valor);
    if (parsed?.cacheKey !== cacheKey) return null;

    return {
      payload: parsed.payload,
      expiresAt: new Date(parsed.expiresAt),
      staleAt: new Date(parsed.staleAt)
    } as PersistedQueryCacheRow;
  } catch (error: any) {
    console.error('[Pedidos Cache] Falha ao ler cache persistente:', error?.message || error);
    return null;
  }
};

const writePersistedQueryCache = async (
  cacheKey: string,
  payload: any,
  ttlMs = PERSISTED_QUERY_CACHE_TTL_MS,
  staleMs = PERSISTED_QUERY_CACHE_STALE_MS
) => {
  try {
    const valor = JSON.stringify({
      cacheKey,
      payload,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
      staleAt: new Date(Date.now() + staleMs).toISOString()
    });

    await prisma.configuracaoSistema.upsert({
      where: { chave: getPersistedCacheConfigKey(cacheKey) },
      create: {
        chave: getPersistedCacheConfigKey(cacheKey),
        valor,
        descricao: 'Cache persistente de consultas de pedidos externos',
        tipo: 'json',
        editavel: false
      },
      update: { valor }
    });
  } catch (error: any) {
    console.error('[Pedidos Cache] Falha ao gravar cache persistente:', error?.message || error);
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  console.log('[API Pedidos Externos] Nova requisição recebida:', {
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { 
      data_inicio, 
      data_fim, 
      limit = '100', 
      offset = '0',
      tipo_entrega,
      status,
      search,
      stats,
      tipo_data,
      cidade,
      bairro,
      ordenacao_valor,
      classificacao_logistica,
      somente_recebidos,
      somente_entregas,
      empresa_id,
      preload_month
    } = req.query;

    const tipoData = typeof tipo_data === 'string' 
      ? tipo_data.toLowerCase() 
      : 'recebimento';
    const classificacaoLogistica =
      typeof classificacao_logistica === 'string' ? classificacao_logistica.toLowerCase() : '';
    const somenteRecebidos = somente_recebidos === '1';
    const somenteEntregas = somente_entregas === '1';
    const empresaIdFiltro = typeof empresa_id === 'string' ? Number(empresa_id) : null;

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    console.log('[API Pedidos Externos] Credenciais:', {
      username: username ? 'Configurado' : 'NÃO CONFIGURADO',
      password: password ? 'Configurado' : 'NÃO CONFIGURADO'
    });

    if (!username || !password) {
      console.warn('[API Pedidos Externos] Credenciais da API externa não configuradas. Retornando lista vazia.');
      return res.status(200).json({
        data: [],
        total: 0,
        warning: 'Credenciais da API externa não configuradas no .env',
        details: 'API_EXTERNA_USERNAME e API_EXTERNA_PASSWORD são necessários.'
      });
    }

    const listarPedidosExternos = async (filtros: { limit?: number; offset?: number; [key: string]: any }) => {
      // O endpoint externo de pedidos retorna vazio quando recebe o periodo em
      // alguns ambientes. Carregamos a pagina e aplicamos a data localmente.
      const { data_inicio: _dataInicio, data_fim: _dataFim, tipo_data: _tipoData, ...filtrosConsulta } = filtros;
      return apiExternaService.listarPedidos(
        filtrosConsulta,
        username,
        password
      );
    };

    const listarApuracoesExternas = (filtros: { limit?: number; offset?: number; [key: string]: any }) =>
      apiExternaService.listarApuracoes(
        filtros,
        username,
        password
      );

    const refreshMonthBase = async () => {
      if (monthBaseRefreshPromise) return monthBaseRefreshPromise;

      monthBaseRefreshPromise = (async () => {
        const data: any[] = [];
        const batchLimit = 100;
        const maxRecords = 1500;

        for (let currentOffset = 0; currentOffset < maxRecords; currentOffset += batchLimit) {
          const batch = await listarPedidosExternos({ limit: batchLimit, offset: currentOffset });
          if (!batch || !Array.isArray(batch.data) || batch.data.length === 0) break;
          data.push(...batch.data);
          if (batch.data.length < batchLimit) break;
        }

        if (data.length === 0) {
          throw new Error('API externa retornou base mensal vazia');
        }

        const now = Date.now();
        monthBaseCache = {
          data,
          expiresAt: now + MONTH_BASE_CACHE_TTL_MS,
          staleAt: now + MONTH_BASE_CACHE_STALE_MS
        };
        void writePersistedQueryCache(
          MONTH_BASE_CACHE_KEY,
          { data },
          MONTH_BASE_CACHE_TTL_MS,
          MONTH_BASE_CACHE_STALE_MS
        );
        return data;
      })().finally(() => {
        monthBaseRefreshPromise = null;
      });

      return monthBaseRefreshPromise;
    };

    const getMonthBase = async () => {
      const now = Date.now();
      if (monthBaseCache && monthBaseCache.expiresAt > now) return monthBaseCache.data;

      const persisted = await readPersistedQueryCache(MONTH_BASE_CACHE_KEY);
      const persistedData = Array.isArray(persisted?.payload?.data) ? persisted.payload.data : null;
      if (persistedData && persistedData.length > 0 && persisted) {
        monthBaseCache = {
          data: persistedData,
          expiresAt: persisted.expiresAt.getTime(),
          staleAt: persisted.staleAt.getTime()
        };
        if (persisted.expiresAt.getTime() > now) return persistedData;
        if (persisted.staleAt.getTime() > now) {
          void refreshMonthBase().catch((error: any) =>
            console.error('[Pedidos Cache] Falha ao atualizar base mensal:', error?.message || error)
          );
          return persistedData;
        }
      }

      if (monthBaseCache && monthBaseCache.staleAt > now) {
        void refreshMonthBase().catch((error: any) =>
          console.error('[Pedidos Cache] Falha ao atualizar base mensal:', error?.message || error)
        );
        return monthBaseCache.data;
      }

      return refreshMonthBase();
    };

    if (preload_month === '1') {
      const base = await getMonthBase();
      return res.status(200).json({ warmed: true, records: base.length });
    }

    console.log('[API Pedidos Externos] Parâmetros recebidos:', {
      data_inicio,
      data_fim,
      limit,
      offset,
      tipo_entrega,
      status,
      search,
      tipo_data,
      stats
    });

    const requestedLimit = limit ? parseInt(limit as string, 10) : 100;
    const safeLimit = Number.isFinite(requestedLimit) ? Math.min(requestedLimit, 100) : 100;
    const requestedOffset = offset ? parseInt(offset as string, 10) : 0;
    const safeOffset = Number.isFinite(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0;
    const fetchLimit = safeLimit;
    const filtrosApi: any = {
      limit: fetchLimit,
      offset: 0
    };



    if (data_inicio && typeof data_inicio === 'string' && data_inicio !== 'undefined') {
      filtrosApi.data_inicio = data_inicio;
    }
    if (data_fim && typeof data_fim === 'string' && data_fim !== 'undefined') {
      filtrosApi.data_fim = data_fim;
    }

    if (tipoData === 'entrega') {
      filtrosApi.tipo_data = 'entrega';
    } else {
      filtrosApi.tipo_data = 'recebimento';
    }

    if (typeof tipo_entrega === 'string') {
      filtrosApi.tipo_entrega = tipo_entrega;
    }
    if (typeof status === 'string') {
      filtrosApi.status = status;
    }
    if (typeof search === 'string' && search.trim()) {
      filtrosApi.search = search.trim();
    }

    console.log('[API Pedidos Externos] Filtros para a API:', filtrosApi);

    const inicio = data_inicio && typeof data_inicio === 'string' ? new Date(`${data_inicio}T00:00:00`) : null;
    const fim = data_fim && typeof data_fim === 'string' ? new Date(`${data_fim}T23:59:59`) : null;

    console.log('[API Pedidos Externos] Datas parseadas:', { inicio, fim });

    const pickString = (...values: Array<unknown>) => {
      for (const value of values) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed) return trimmed;
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
          return String(value);
        }
      }
      return null;
    };

    const parseNumber = (v: any) => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') {
        const s = v.trim();
        if (!s) return null;
        const n = Number(s);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    };

    const formatDate = (d: Date) => d.toISOString().slice(0, 10);

    const addDays = (date: Date, days: number) => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    };

    const dateOnly = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = (start: Date, end: Date) => {
      const startTime = dateOnly(start).getTime();
      const endTime = dateOnly(end).getTime();
      return Math.max(0, Math.round((endTime - startTime) / 86400000));
    };

    const parseDate = (v: any) => {
      if (!v) return null;
      const s = String(v).trim();
      if (!s) return null;
      // Timestamp numérico
      if (/^\d+$/.test(s)) {
        const d = new Date(Number(s));
        return isNaN(d.getTime()) ? null : d;
      }
      // ISO com T
      if (s.includes('T')) {
        // A API retorna timestamps em UTC/ISO. Para o filtro da tela, a data
        // deve respeitar o dia exibido pelo ERP, sem recuar para o dia anterior
        // por causa do fuso horario local.
        const [datePart, timePart = '00:00:00'] = s.split('T');
        const [year, month, day] = datePart.split('-').map((n) => Number(n));
        const [hh = 0, mm = 0, ssRaw = 0] = timePart.replace(/Z$/, '').split(':').map((n) => Number(n));
        const ss = Number.isFinite(ssRaw) ? Math.floor(ssRaw) : 0;
        const d = new Date(year, month - 1, day, hh || 0, mm || 0, ss);
        return isNaN(d.getTime()) ? null : d;
      }
      // DD/MM/YYYY [HH:MM[:SS]]
      if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
        const [datePart, timePart] = s.split(' ');
        const [day, month, year] = datePart.split('/').map((n) => Number(n));
        const [hh = 0, mm = 0, ss = 0] = (timePart || '').split(':').map((n) => Number(n));
        const d = new Date(year, month - 1, day, hh, mm, ss);
        return isNaN(d.getTime()) ? null : d;
      }
      // DD-MM-YYYY [HH:MM[:SS]]
      if (/^\d{1,2}-\d{1,2}-\d{4}/.test(s)) {
        const [datePart, timePart] = s.split(' ');
        const [day, month, year] = datePart.split('-').map((n) => Number(n));
        const [hh = 0, mm = 0, ss = 0] = (timePart || '').split(':').map((n) => Number(n));
        const d = new Date(year, month - 1, day, hh, mm, ss);
        return isNaN(d.getTime()) ? null : d;
      }
      // YYYY-MM-DD HH:MM[:SS]
      if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{1,2}/.test(s)) {
        const [datePart, timePart] = s.split(' ');
        const [year, month, day] = datePart.split('-').map((n) => Number(n));
        const [hh = 0, mm = 0, ss = 0] = (timePart || '').split(':').map((n) => Number(n));
        const d = new Date(year, month - 1, day, hh, mm, ss);
        return isNaN(d.getTime()) ? null : d;
      }
      // YYYY/MM/DD [HH:MM[:SS]]
      if (/^\d{4}\/\d{2}\/\d{2}/.test(s)) {
        const [datePart, timePart] = s.split(' ');
        const [year, month, day] = datePart.split('/').map((n) => Number(n));
        const [hh = 0, mm = 0, ss = 0] = (timePart || '').split(':').map((n) => Number(n));
        const d = new Date(year, month - 1, day, hh, mm, ss);
        return isNaN(d.getTime()) ? null : d;
      }
      // YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
      }
      // Última tentativa com Date
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const getRef = (p: any) => {
      try {
        if (tipoData === 'entrega') {
          return (
            parseDate(p.DATA_ENTREGA) ||
            parseDate(p.data_entrega)
          );
        }

        // padrão = recebimento
        return (
          parseDate(p.DATA_HORA_RECEBIMENTO) ||
          parseDate(p.data_hora_recebimento) ||
          parseDate(p.DATA_RECEBIMENTO) ||
          parseDate(p.data_recebimento) ||
          parseDate(p.PEDIDO_DATA_FECHAMENTO) ||
          parseDate(p.PEDIDO_DATA_CADASTRO) ||
          parseDate(p.DATA_HORA_CADASTRO) ||
          parseDate(p.DATA_CADASTRO) ||
          parseDate(p.DATA_EMISSAO)
        );
      } catch (error) {
        console.error('[API Pedidos Externos] Erro ao parsear data:', error, p);
        return null;
      }
    };

    const EMPRESA_ID_ALVO = Number.isFinite(empresaIdFiltro) ? empresaIdFiltro : 1;
    const parseEmpresaId = (v: any) => {
      if (v === null || v === undefined) return null;
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      const s = String(v).trim();
      if (!s) return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };
    const getEmpresaId = (p: any) => {
      return (
        parseEmpresaId(p.EMPRESA_ID) ??
        parseEmpresaId(p.EMPRESAID) ??
        parseEmpresaId(p.ID_EMPRESA) ??
        parseEmpresaId(p.EMPRESA) ??
        null
      );
    };

    const normalizePedido = (p: any) => {
      try {
        const cliente = p?.CLIENTE ?? p?.cliente ?? null;
        const numeroNota = pickString(
          p.NUMERO_NOTA,
          p.NUMERO_NOTA_FISCAL,
          p.NOTA_FISCAL_NUMERO,
          p.NOTAFISCAL_NUMERO,
          p.NF_NUMERO,
          p.NF,
          p.NUMERO_NF,
          p.NUMERO,
          p.NOTA_FISCAL
        );
      const cnpjCpf = pickString(
        p.CNPJ_CPF,
        p.CNPJCPF,
        p.CNPJ_CPF_DESTINATARIO,
        p.CPF_CNPJ,
        p.CNPJ,
        p.CPF,
        p.cnpj_cpf,
        p.cnpjcpf,
        p.cnpj,
        p.cpf,
        cliente?.CNPJ,
        cliente?.CPF,
        cliente?.CNPJ_CPF,
        cliente?.cnpj,
        cliente?.cpf,
        cliente?.cnpj_cpf
      );
      const identificacaoNfe = pickString(
        p.IDENTIFICACAO_NFE,
        p.CHAVE_NFE,
        p.CHAVE,
        p.IDENTIFICACAO,
        p.NFE_CHAVE,
        p.CHAVE_ACESSO
      );
      const nomeBairroNota = pickString(
        p.NOME_BAIRRO_NOTA,
        p.nome_bairro_nota,
        p.BAIRRO,
        p.bairro,
        p.NOME_BAIRRO,
        p.BAIRRO_ENTREGA,
        cliente?.BAIRRO,
        cliente?.bairro
      );

      const nomeCidade = pickString(
        p.NOME_CIDADE,
        p.nome_cidade,
        p.CIDADE,
        p.cidade,
        p.CIDADE_ENTREGA,
        p.MUNICIPIO,
        cliente?.CIDADE,
        cliente?.cidade
      );

      const estadoDestino = pickString(
        p.ESTADO_DESTINO,
        p.estado_destino,
        p.UF,
        p.uf,
        p.UF_ENTREGA,
        p.ESTADO,
        cliente?.ESTADO,
        cliente?.estado,
        cliente?.UF,
        cliente?.uf,
        p.ESTADO_NOTA_ID
      );


      const logradouroEntrega = pickString(
        p.LOGRADOURO_ENTREGA,
        p.LOGRADOURO,
        p.RUA,
        p.ENDERECO,
        p.ENDERECO_ENTREGA,
        p.ENDERECO_COMPLETO,
        p.logradouro,
        cliente?.ENDERECO,
        cliente?.endereco,
        cliente?.logradouro
      );

      const complementoEntrega = pickString(
        p.COMPLEMENTO_ENTREGA,
        p.COMPLEMENTO,
        p.COMPLEMENTO_ENTREGA
      );
      const cep = pickString(
        p.CEP,
        p.CEP_ENTREGA,
        p.CEP_CONS_FINAL,
        p.CEP_DESTINO,
        cliente?.CEP,
        cliente?.cep
      );

      // Log para debug interno no servidor se necessário
      return {
        ...p,
        NUMERO_NOTA: numeroNota ?? p.NUMERO_NOTA ?? null,
        IDENTIFICACAO_NFE: identificacaoNfe ?? p.IDENTIFICACAO_NFE ?? null,
        CNPJ_CPF: cnpjCpf ?? p.CNPJ_CPF ?? p.CNPJ ?? p.CPF ?? null,
        NOME_BAIRRO_NOTA: nomeBairroNota ?? p.NOME_BAIRRO_NOTA ?? null,
        NOME_CIDADE: nomeCidade ?? p.NOME_CIDADE ?? null,
        ESTADO_DESTINO: estadoDestino ?? p.ESTADO_DESTINO ?? null,
        LOGRADOURO_ENTREGA: logradouroEntrega ?? p.LOGRADOURO_ENTREGA ?? null,
        COMPLEMENTO_ENTREGA: complementoEntrega ?? p.COMPLEMENTO_ENTREGA ?? null,
        CEP: cep ?? p.CEP ?? p.CEP_ENTREGA ?? p.CEP_CONS_FINAL ?? null,
        _DEBUG_RAW: {
          b: p.NOME_BAIRRO_NOTA || p.BAIRRO || '(vazio)',
          c: p.NOME_CIDADE || p.CIDADE || '(vazio)',
          e: p.ESTADO_DESTINO || p.UF || '(vazio)'
        }
      };
      } catch (error) {
        console.error('[API Pedidos Externos] Erro no normalizePedido:', error);
        return p; // Retorna o pedido original em caso de erro
      }
    };

    const getApuracaoId = (a: any) => {
      return (
        parseNumber(a.ORCAMENTO_BASE_ID) ??
        parseNumber(a.ORCAMENTO_ID) ??
        parseNumber(a.ORCAMENTO) ??
        parseNumber(a.ORCAMENTOID) ??
        null
      );
    };

    const enrichWithApuracao = (p: any, ap: any) => {
      if (!ap) return p;
      const cliente = ap?.CLIENTE ?? ap?.cliente ?? null;
      const numeroNota = pickString(
        ap.NUMERO_NOTA,
        ap.NUMERO_NOTA_FISCAL,
        ap.NOTA_FISCAL_NUMERO,
        ap.NOTAFISCAL_NUMERO,
        ap.NF_NUMERO,
        ap.NF,
        ap.NUMERO_NF,
        ap.NUMERO
      );
      const cnpjCpf = pickString(
        ap.CNPJ_CPF,
        ap.CNPJCPF,
        ap.CNPJ_CPF_DESTINATARIO,
        ap.CPF_CNPJ,
        ap.CNPJ,
        ap.CPF,
        ap.cnpj_cpf,
        ap.cnpjcpf,
        ap.cnpj,
        ap.cpf,
        cliente?.CNPJ,
        cliente?.CPF,
        cliente?.CNPJ_CPF,
        cliente?.cnpj,
        cliente?.cpf,
        cliente?.cnpj_cpf
      );
      const identificacaoNfe = pickString(
        ap.IDENTIFICACAO_NFE,
        ap.CHAVE_NFE,
        ap.CHAVE,
        ap.IDENTIFICACAO,
        ap.NFE_CHAVE,
        ap.CHAVE_ACESSO
      );
      const nomeBairroNota = pickString(
        ap.NOME_BAIRRO_NOTA,
        ap.nome_bairro_nota,
        ap.BAIRRO,
        ap.bairro,
        ap.NOME_BAIRRO,
        ap.BAIRRO_ENTREGA,
        cliente?.BAIRRO,
        cliente?.bairro
      );
      const nomeCidade = pickString(
        ap.NOME_CIDADE,
        ap.nome_cidade,
        ap.CIDADE,
        ap.cidade,
        ap.CIDADE_ENTREGA,
        ap.MUNICIPIO,
        cliente?.CIDADE,
        cliente?.cidade
      );
      const estadoDestino = pickString(
        ap.ESTADO_DESTINO,
        ap.estado_destino,
        ap.UF,
        ap.uf,
        ap.UF_ENTREGA,
        ap.ESTADO,
        cliente?.ESTADO,
        cliente?.estado,
        cliente?.UF,
        cliente?.uf
      );
      const logradouroEntrega = pickString(
        ap.LOGRADOURO,
        ap.LOGRADOURO_ENTREGA,
        ap.RUA,
        ap.ENDERECO,
        ap.ENDERECO_ENTREGA,
        ap.ENDERECO_COMPLETO,
        cliente?.ENDERECO,
        cliente?.endereco
      );
      const complementoEntrega = pickString(
        ap.COMPLEMENTO,
        ap.COMPLEMENTO_ENTREGA
      );
      const cep = pickString(
        ap.CEP,
        ap.CEP_ENTREGA,
        ap.CEP_CONS_FINAL,
        ap.CEP_DESTINO,
        cliente?.CEP,
        cliente?.cep
      );
      return normalizePedido({
        ...p,
        NUMERO_NOTA: numeroNota ?? p.NUMERO_NOTA,
        IDENTIFICACAO_NFE: identificacaoNfe ?? p.IDENTIFICACAO_NFE,
        CNPJ_CPF: cnpjCpf ?? p.CNPJ_CPF ?? p.CNPJ ?? p.CPF,
        NOME_BAIRRO_NOTA: nomeBairroNota ?? p.NOME_BAIRRO_NOTA,
        NOME_CIDADE: nomeCidade ?? p.NOME_CIDADE,
        ESTADO_DESTINO: estadoDestino ?? p.ESTADO_DESTINO,
        LOGRADOURO_ENTREGA: logradouroEntrega ?? p.LOGRADOURO_ENTREGA,
        COMPLEMENTO_ENTREGA: complementoEntrega ?? p.COMPLEMENTO_ENTREGA,
        CEP: cep ?? p.CEP ?? p.CEP_ENTREGA ?? p.CEP_CONS_FINAL
      });
    };

    const normalizeText = (value: unknown) => {
      return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
    };

    const cidadeFiltro = typeof cidade === 'string' ? normalizeText(cidade) : '';
    const bairroFiltro = typeof bairro === 'string' ? normalizeText(bairro) : '';
    const searchFiltro = typeof search === 'string' ? normalizeText(search) : '';
    const ordenacaoValor = typeof ordenacao_valor === 'string' ? ordenacao_valor : '';

    const getValorPedido = (p: any) => {
      const v = p.VALOR_PEDIDO ?? p.VALOR_TOTAL ?? p.VALOR ?? p.valor ?? p.valor_total ?? 0;
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string') {
        const n = Number(v.replace(/\./g, '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
      }
      return 0;
    };

    const parseDateSafe = (value: unknown) => {
      if (!value) return null;
      const raw = String(value).trim();
      if (!raw) return null;
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const isPedidoEntregaLogistica = async (pedido: any) => {
      const tipoEntregaPedido = String(pedido?.TIPO_ENTREGA ?? pedido?.tipo_entrega ?? '').toUpperCase();
      if (tipoEntregaPedido === 'ATO' || tipoEntregaPedido === 'NDF') return false;

      const pedidoId =
        parseNumber(pedido?.ORCAMENTO_ID) ??
        parseNumber(pedido?.ORCAMENTO_BASE_ID) ??
        parseNumber(pedido?.PEDIDO_ID) ??
        parseNumber(pedido?.ID) ??
        parseNumber(pedido?.orcamento_id) ??
        parseNumber(pedido?.orcamento_base_id) ??
        parseNumber(pedido?.pedido_id) ??
        parseNumber(pedido?.id);

      if (pedidoId === null) {
        return ['EPG', 'ENT'].includes(tipoEntregaPedido);
      }

      const logistica = await apiExternaService.buscarPedidoLogistica(pedidoId, username, password);
      const pedidoLogistica = logistica?.pedido || {};
      const tipoEntregaLogistica = String(
        pedidoLogistica.TIPO_ENTREGA ?? pedidoLogistica.tipo_entrega ?? tipoEntregaPedido
      ).toUpperCase();

      if (tipoEntregaLogistica === 'ATO' || tipoEntregaLogistica === 'NDF') return false;

      const entregas = Array.isArray(logistica?.entregas) ? logistica.entregas : [];
      const entregaNoAto = entregas.some((entrega: any) =>
        String(entrega?.ENTREGA_NO_ATO ?? entrega?.entrega_no_ato ?? '').toUpperCase() === 'S'
      );

      return !entregaNoAto;
    };

    const isPedidoEntregaDireta = (pedido: any) => {
      const tipoEntregaPedido = String(pedido?.TIPO_ENTREGA ?? pedido?.tipo_entrega ?? '').toUpperCase();
      return ['EPG', 'ENT'].includes(tipoEntregaPedido);
    };

    const isPedidoRecebidoLogistica = async (pedido: any) => {
      const recebidoBruto = String(pedido?.RECEBIDO ?? pedido?.recebido ?? '').toUpperCase() === 'S';
      const dataHoraRecebimentoBruta =
        parseDateSafe(pedido?.DATA_HORA_RECEBIMENTO) ??
        parseDateSafe(pedido?.data_hora_recebimento) ??
        parseDateSafe(pedido?.DATA_RECEBIMENTO) ??
        parseDateSafe(pedido?.data_recebimento);

      const pedidoId =
        parseNumber(pedido?.ORCAMENTO_ID) ??
        parseNumber(pedido?.ORCAMENTO_BASE_ID) ??
        parseNumber(pedido?.PEDIDO_ID) ??
        parseNumber(pedido?.ID) ??
        parseNumber(pedido?.orcamento_id) ??
        parseNumber(pedido?.orcamento_base_id) ??
        parseNumber(pedido?.pedido_id) ??
        parseNumber(pedido?.id);

      if (pedidoId === null) {
        return recebidoBruto && Boolean(dataHoraRecebimentoBruta);
      }

      const logistica = await apiExternaService.buscarPedidoLogistica(pedidoId, username, password);
      const pedidoLogistica = logistica?.pedido || {};
      const recebidoLogistica = String(
        pedidoLogistica.RECEBIDO ?? pedidoLogistica.recebido ?? pedido?.RECEBIDO ?? pedido?.recebido ?? ''
      ).toUpperCase() === 'S';
      const dataHoraRecebimentoLogistica =
        parseDateSafe(pedidoLogistica.DATA_HORA_RECEBIMENTO) ??
        parseDateSafe(pedidoLogistica.data_hora_recebimento) ??
        parseDateSafe(pedidoLogistica.DATA_RECEBIMENTO) ??
        parseDateSafe(pedidoLogistica.data_recebimento) ??
        dataHoraRecebimentoBruta;

      return recebidoLogistica && Boolean(dataHoraRecebimentoLogistica);
    };

    const isPedidoRecebidoDireto = (pedido: any) => {
      const recebidoValor = String(pedido?.RECEBIDO ?? pedido?.recebido ?? '').trim().toUpperCase();
      const recebidoBruto = recebidoValor === 'S' || recebidoValor === 'SIM' || recebidoValor === 'TRUE' || recebidoValor === '1';
      const dataRecebimento =
        parseDateSafe(pedido?.DATA_HORA_RECEBIMENTO) ??
        parseDateSafe(pedido?.data_hora_recebimento) ??
        parseDateSafe(pedido?.DATA_RECEBIMENTO) ??
        parseDateSafe(pedido?.data_recebimento);

      // A flag RECEBIDO e a informação oficial para este filtro. Alguns
      // pedidos recebidos não trazem a data no retorno resumido de /pedidos;
      // quando a flag não vem, a data de recebimento é a segunda evidência.
      return recebidoBruto && Boolean(dataRecebimento);
    };

    const aplicarClassificacaoLogistica = async (items: any[]) => {
      if (classificacaoLogistica !== 'entrega' || items.length === 0) {
        return items;
      }

      // A listagem consolidada ja traz a classificacao usada pela tela.
      // Nao fazer uma chamada de logistica para cada linha da listagem.
      return items.filter(isPedidoEntregaDireta);

      const classificados = await Promise.all(
        items.map(async (pedido) => ({
          pedido,
          manter: await isPedidoEntregaLogistica(pedido)
        }))
      );

      return classificados.filter((item) => item.manter).map((item) => item.pedido);
    };

    const aplicarFiltroRecebidos = async (items: any[]) => {
      if (!somenteRecebidos || items.length === 0) {
        return items;
      }

      return items.filter(isPedidoRecebidoDireto);

      const classificados = await Promise.all(
        items.map(async (pedido) => ({
          pedido,
          manter: await isPedidoRecebidoLogistica(pedido)
        }))
      );

      return classificados.filter((item) => item.manter).map((item) => item.pedido);
    };

    const applyFilters = (items: any[]) => {
      const results = (items || []).map(normalizePedido).filter((p: any) => {
        if (getEmpresaId(p) !== EMPRESA_ID_ALVO) return false;
        const ref = getRef(p);
        
        // Se houver filtro de data (inicio ou fim), aplicamos rigorosamente
        if (inicio || fim) {
          if (!ref) return false;

          if (inicio && ref < inicio) return false;
          if (fim && ref > fim) return false;
        }

        // Aplicar filtro de tipo_entrega manualmente se existir
        if (tipo_entrega && typeof tipo_entrega === 'string') {
          const tiposPermitidos = tipo_entrega.split(',').map(t => t.trim().toUpperCase());
          const tipoDoPedido = String(p.TIPO_ENTREGA || '').toUpperCase();
          if (!tiposPermitidos.includes(tipoDoPedido)) {
            return false;
          }
        }

        // Aplicar filtro de status manualmente se existir
        if (status === 'FECHADO' && String(p.PEDIDO_FECHADO).toUpperCase() !== 'S') {
          return false;
        }

        if (somenteEntregas) {
          const tipoDoPedido = String(p.TIPO_ENTREGA || '').toUpperCase();
          if (tipoDoPedido === 'ATO' || tipoDoPedido === 'NDF') {
            return false;
          }
        }

        if (cidadeFiltro) {
          const cidadePedido = normalizeText(p.NOME_CIDADE ?? p.CIDADE ?? p.cidade);
          if (!cidadePedido.includes(cidadeFiltro)) return false;
        }

        if (bairroFiltro) {
          const bairroPedido = normalizeText(
            p.NOME_BAIRRO_NOTA ?? p.BAIRRO ?? p.bairro ?? p.NOME_BAIRRO ?? p.BAIRRO_ENTREGA
          );
          if (!bairroPedido.includes(bairroFiltro)) return false;
        }

        if (searchFiltro) {
          const searchable = normalizeText([
            p.ORCAMENTO_ID,
            p.CLIENTE_NOME,
            p.NOME_FANTASIA,
            p.VENDEDOR_NOME,
            p.NUMERO_NOTA,
            p.IDENTIFICACAO_NFE,
            p.CNPJ_CPF,
            p.NOME_CIDADE,
            p.NOME_BAIRRO_NOTA
          ].filter(Boolean).join(' '));
          if (!searchable.includes(searchFiltro)) return false;
        }

        return true;
      });

      if (items.length > 0 && results.length === 0 && (inicio || fim)) {
        console.log('[API Pedidos Externos] Nenhum pedido passou pelos filtros de data. Exemplo de campos de data do primeiro item:', 
          Object.keys(items[0]).filter(k => k.toLowerCase().includes('data') || k.toLowerCase().includes('receb') || k.toLowerCase().includes('entrega'))
            .reduce((obj, key) => ({ ...obj, [key]: items[0][key] }), {})
        );
      }

      return results;
    };

    const queryCacheKey = JSON.stringify({
      v: 23,
      data_inicio,
      data_fim,
      tipo_entrega,
      status,
      search,
      tipoData,
      cidade: cidadeFiltro,
      bairro: bairroFiltro,
      ordenacaoValor,
      classificacaoLogistica,
      somenteRecebidos,
      somenteEntregas,
      empresaIdFiltro: EMPRESA_ID_ALVO,
      stats,
      limit: safeLimit,
      offset: safeOffset
    });
    const hasDateFilter = Boolean(inicio || fim);
    const isSimpleStatsRequest = stats === '1'
      && !hasDateFilter
      && !cidadeFiltro
      && !bairroFiltro
      && !ordenacaoValor
      && !searchFiltro;
    // Os filtros logísticos são aplicados após consultar cada pedido. Portanto,
    // não podemos calcular o total usando apenas uma página da API externa.
    const precisaVarreduraCompleta = stats === '1' || Boolean(
      cidadeFiltro ||
      bairroFiltro ||
      ordenacaoValor ||
      classificacaoLogistica
    );
    const fastCacheKey = queryCacheKey;
    if (!precisaVarreduraCompleta || isSimpleStatsRequest) {
      const cachedFast = fastQueryCache.get(fastCacheKey);
      if (cachedFast && cachedFast.expiresAt > Date.now()) {
        return res.status(200).json({ ...cachedFast.payload, cached: true });
      }
    }

    const persistedQueryCache = await readPersistedQueryCache(queryCacheKey);
    if (persistedQueryCache && persistedQueryCache.expiresAt.getTime() > Date.now()) {
      if (!precisaVarreduraCompleta || isSimpleStatsRequest) {
        fastQueryCache.set(fastCacheKey, {
          expiresAt: persistedQueryCache.expiresAt.getTime(),
          staleAt: persistedQueryCache.staleAt.getTime(),
          payload: persistedQueryCache.payload
        });
      }
      return res.status(200).json({ ...persistedQueryCache.payload, cached: true, persistedCache: true });
    }

    const getFastFallbackPayload = () => {
      const cached = fastQueryCache.get(fastCacheKey);
      if (cached && cached.staleAt > Date.now()) {
        return {
          ...cached.payload,
          stale: true,
          warning: 'API externa demorou para responder. Exibindo ultimo resultado em cache.'
        };
      }

      if (persistedQueryCache && persistedQueryCache.staleAt.getTime() > Date.now()) {
        return {
          ...persistedQueryCache.payload,
          stale: true,
          persistedCache: true,
          warning: 'API externa demorou para responder. Exibindo ultimo resultado persistido em cache.'
        };
      }

      return {
        data: [],
        total: 0,
        totalValor: 0,
        limit: safeLimit,
        offset: safeOffset,
        warning: 'API externa demorou para responder. Tente novamente em alguns instantes.'
      };
    };

    if (isSimpleStatsRequest) {
      try {
        const dataBase = await getMonthBase();
        const filtradosStats = await aplicarFiltroRecebidos(
          await aplicarClassificacaoLogistica(applyFilters(dataBase))
        );
        const totalStats = filtradosStats.length;
        const totalValorStats = filtradosStats.reduce((sum: number, p: any) => sum + getValorPedido(p), 0);

        const statsPayload = {
          total: totalStats,
          totalValor: totalValorStats
        };

        fastQueryCache.set(fastCacheKey, {
          expiresAt: Date.now() + FAST_QUERY_CACHE_TTL_MS,
          staleAt: Date.now() + FAST_QUERY_STALE_TTL_MS,
          payload: statsPayload
        });
        void writePersistedQueryCache(queryCacheKey, statsPayload);

        return res.status(200).json(statsPayload);
      } catch (apiError: any) {
        console.error('[API Pedidos Externos] Falha ao carregar estatistica diaria:', apiError?.message || apiError);
        return res.status(200).json(getFastFallbackPayload());
      }
    }

    if (!precisaVarreduraCompleta) {
      const shouldSliceDates = inicio && fim && diffDays(inicio, fim) > 2;
      let resultadoRapido: { data: any[]; total: number; limit: number; offset: number } | null = null;

      try {
        if (inicio || fim) {
          // /api/v1/pedidos atualmente ignora data_inicio/data_fim. Para não
          // filtrar apenas os 100 pedidos mais recentes, percorremos uma janela
          // paginada e aplicamos a data de recebimento localmente. O limite cobre
          // inclusive pedidos antigos recebidos no dia (ex.: pedido reaberto).
          // Períodos curtos são o caso principal da tela. Consultar diretamente
          // evita carregar toda a base mensal e estourar o limite da Vercel.
          resultadoRapido = await listarPedidosExternos({
            ...filtrosApi,
            limit: safeLimit,
            offset: safeOffset,
            data_inicio: inicio || undefined,
            data_fim: fim || undefined
          });
        } else if (shouldSliceDates) {
          const collected: any[] = [];
          let skipped = 0;
          let cursor = dateOnly(inicio);
          const endDate = dateOnly(fim);
          let hasMoreAfterPage = false;

          while (cursor <= endDate && collected.length < safeLimit) {
            const day = formatDate(cursor);
            const chunkEnd = dateOnly(addDays(cursor, 2));
            const chunkEndSafe = chunkEnd > endDate ? endDate : chunkEnd;
            const chunkEndDay = formatDate(chunkEndSafe);
            const dayResult = await listarPedidosExternos(
              {
                ...filtrosApi,
                data_inicio: day,
                data_fim: chunkEndDay,
                limit: 100,
                offset: 0
              }
            );

            if (!dayResult || !Array.isArray((dayResult as any).data)) {
              throw new Error('API externa nao respondeu pedidos no periodo solicitado');
            }

            const dayItems = await aplicarFiltroRecebidos(
              await aplicarClassificacaoLogistica(applyFilters(dayResult?.data || []))
            );

            for (const item of dayItems) {
              if (skipped < safeOffset) {
                skipped += 1;
                continue;
              }
              if (collected.length < safeLimit) {
                collected.push(item);
              } else {
                hasMoreAfterPage = true;
                break;
              }
            }

            if (hasMoreAfterPage) break;
            cursor = addDays(chunkEndSafe, 1);
          }

          resultadoRapido = {
            data: collected,
            total: safeOffset + collected.length + (hasMoreAfterPage || cursor <= endDate ? safeLimit : 0),
            limit: safeLimit,
            offset: safeOffset
          };
        } else {
          resultadoRapido = await listarPedidosExternos(
            {
              ...filtrosApi,
              limit: safeLimit,
              offset: safeOffset
            }
          );
        }
      } catch (apiError: any) {
        console.error('[API Pedidos Externos] Falha no caminho rapido:', apiError?.message || apiError);
        return res.status(200).json(getFastFallbackPayload());
      }

      if (!resultadoRapido || typeof resultadoRapido !== 'object' || !Array.isArray((resultadoRapido as any).data)) {
        return res.status(200).json(getFastFallbackPayload());
      }

      const dataRapida = (
        await aplicarFiltroRecebidos(
          await aplicarClassificacaoLogistica(applyFilters(resultadoRapido.data || []))
        )
      ).sort((a, b) => {
        const refA = getRef(a);
        const refB = getRef(b);
        if (!refA && !refB) return 0;
        if (!refA) return 1;
        if (!refB) return -1;
        return refA.getTime() - refB.getTime();
      });
      const totalRapido = safeOffset + dataRapida.length;

      const payloadRapido = {
        data: dataRapida,
        total: totalRapido,
        totalValor: dataRapida.reduce((sum: number, p: any) => sum + getValorPedido(p), 0),
        limit: safeLimit,
        offset: safeOffset
      };

      fastQueryCache.set(fastCacheKey, {
        expiresAt: Date.now() + FAST_QUERY_CACHE_TTL_MS,
        staleAt: Date.now() + FAST_QUERY_STALE_TTL_MS,
        payload: payloadRapido
      });
      void writePersistedQueryCache(queryCacheKey, payloadRapido);

      return res.status(200).json(payloadRapido);
    }

    const sortPedidosFiltrados = (items: any[]) => {
      return items.sort((a, b) => {
        if (ordenacaoValor === 'valor_asc') {
          return getValorPedido(a) - getValorPedido(b);
        }
        if (ordenacaoValor === 'valor_desc') {
          return getValorPedido(b) - getValorPedido(a);
        }

        const refA = getRef(a);
        const refB = getRef(b);
        if (!refA && !refB) return 0;
        if (!refA) return 1;
        if (!refB) return -1;
        return refA.getTime() - refB.getTime();
      });
    };

    const listarTodosPedidosPeriodo = async () => {
      const allData: any[] = [];
      const batchLimit = 500;
      // Para a listagem diária, os pedidos recentes ficam nos primeiros lotes.
      // Limitar a varredura evita que a tela fique aguardando a API externa por
      // dezenas de segundos quando ela não informa a data em algum registro.
      const periodoCurto = inicio && fim && diffDays(inicio, fim) <= 2;
      const maxRecords = periodoCurto ? 1500 : 20000;
      let currentOffset = 0;
      let totalExterno: number | null = null;
      let guard = 0;

      while (currentOffset < maxRecords) {
        const resultado = await listarPedidosExternos(
          {
            ...filtrosApi,
            limit: batchLimit,
            offset: currentOffset
          }
        );

        if (!resultado || typeof resultado !== 'object' || !Array.isArray((resultado as any).data)) {
          if (currentOffset === 0) {
            throw new Error('Resposta invalida da API externa');
          }
          break;
        }

        const dataBatch = resultado.data || [];
        if (typeof resultado.total === 'number') {
          totalExterno = resultado.total;
        }
        if (dataBatch.length === 0) break;

        allData.push(...dataBatch);
        currentOffset += dataBatch.length;
        guard += 1;

        if (dataBatch.length < batchLimit) break;
        if (totalExterno !== null && currentOffset >= totalExterno) break;
        if (guard >= 200) break;
      }

      console.log('[API Pedidos Externos] Lotes carregados:', {
        recebidos: allData.length,
        totalExterno,
        maxRecords
      });

      return allData;
    };

    const enriquecerPedidosComApuracoes = async (items: any[]) => {
      if (items.length === 0) return items;

      try {
        const refs = items.map((p: any) => getRef(p)).filter(Boolean) as Date[];
        const minRef = refs.length ? new Date(Math.min(...refs.map(r => r.getTime()))) : null;
        const maxRef = refs.length ? new Date(Math.max(...refs.map(r => r.getTime()))) : null;
        const inicioAp = data_inicio && typeof data_inicio === 'string'
          ? data_inicio
          : minRef
            ? formatDate(minRef)
            : formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
        const fimAp = data_fim && typeof data_fim === 'string'
          ? data_fim
          : maxRef
            ? formatDate(maxRef)
            : formatDate(new Date());

        const apMap = new Map<number, any>();
        const batchLimit = 200;
        const maxRecords = 5000;
        let currentOffset = 0;
        let guard = 0;

        while (currentOffset < maxRecords) {
          const apBatch = await listarApuracoesExternas(
            {
              data_inicio: inicioAp,
              data_fim: fimAp,
              limit: batchLimit,
              offset: currentOffset
            }
          );
          const dataBatch = apBatch?.data || [];
          if (dataBatch.length === 0) break;
          dataBatch.forEach((a: any) => {
            const id = getApuracaoId(a);
            if (id !== null && !apMap.has(id)) {
              apMap.set(id, a);
            }
          });
          currentOffset += dataBatch.length;
          guard += 1;
          if (dataBatch.length < batchLimit) break;
          if (guard >= 50) break;
        }

        return items.map((p: any) => {
          const ap = apMap.get(parseNumber(p.ORCAMENTO_ID) ?? -1);
          return enrichWithApuracao(p, ap);
        });
      } catch (error: any) {
        console.error('[API Pedidos Externos] Falha ao enriquecer apuracoes:', error?.message || error);
        return items;
      }
    };

    const cacheKey = JSON.stringify({
      data_inicio,
      data_fim,
      tipo_entrega,
      status,
      search,
      tipoData,
        cidade: cidadeFiltro,
        bairro: bairroFiltro,
        ordenacaoValor,
        classificacaoLogistica,
        somenteRecebidos,
        somenteEntregas,
        empresaIdFiltro: EMPRESA_ID_ALVO
      });
    const cached = fullScanCache.get(cacheKey);
    let filtradosCorrigidos: any[] = [];
    let totalValorCorrigido = 0;

    if (cached && cached.expiresAt > Date.now()) {
      filtradosCorrigidos = cached.data;
      totalValorCorrigido = cached.totalValor;
    } else {
      let baseDataCorrigida: any[] = [];
      try {
        const pedidosBrutos = await listarTodosPedidosPeriodo();
        baseDataCorrigida = pedidosBrutos.map(normalizePedido);
      } catch (apiError: any) {
        console.error('[API Pedidos Externos] Erro na API externa:', apiError?.message || apiError);
        return res.status(500).json({
          error: 'Erro na API externa',
          details: apiError.message
        });
      }

      const precisaEnriquecer = cidadeFiltro || bairroFiltro || baseDataCorrigida.some((p: any) => {
        const numeroNota = pickString(p.NUMERO_NOTA, p.IDENTIFICACAO_NFE);
        const cep = pickString(p.CEP, p.CEP_ENTREGA, p.CEP_CONS_FINAL);
        return !numeroNota || !p.NOME_BAIRRO_NOTA || !p.NOME_CIDADE || !p.ESTADO_DESTINO || !cep;
      });

      if (precisaEnriquecer) {
        baseDataCorrigida = await enriquecerPedidosComApuracoes(baseDataCorrigida);
      }

      filtradosCorrigidos = sortPedidosFiltrados(
        await aplicarFiltroRecebidos(
          await aplicarClassificacaoLogistica(applyFilters(baseDataCorrigida))
        )
      );
      totalValorCorrigido = filtradosCorrigidos.reduce((sum: number, p: any) => sum + getValorPedido(p), 0);
      fullScanCache.set(cacheKey, {
        expiresAt: Date.now() + FULL_SCAN_CACHE_TTL_MS,
        data: filtradosCorrigidos,
        totalValor: totalValorCorrigido
      });
    }

    console.log('[API Pedidos Externos] Resultado final filtrado:', {
      total: filtradosCorrigidos.length,
      offset: safeOffset,
      limit: safeLimit,
      stats
    });

    if (stats === '1') {
      const statsPayload = {
        total: filtradosCorrigidos.length,
        totalValor: totalValorCorrigido
      };
      void writePersistedQueryCache(queryCacheKey, statsPayload);
      return res.status(200).json(statsPayload);
    }

    const pagePayload = {
      data: filtradosCorrigidos.slice(safeOffset, safeOffset + safeLimit),
      total: filtradosCorrigidos.length,
      limit: safeLimit,
      offset: safeOffset
    };
    void writePersistedQueryCache(queryCacheKey, pagePayload);
    return res.status(200).json(pagePayload);

    /*
     * Implementacao legada mantida apenas no historico do arquivo.
     * O fluxo acima retorna antes deste ponto; deixar esse trecho ativo fazia
     * o TypeScript validar codigo morto e gerar falsos erros.

    let filtrados: any[] = [];

    if (stats === '1') {
      // Se estamos pedindo stats, queremos o total filtrado para o período
      const resultado = await listarPedidosExternos(
        filtrosApi,
        username,
        password
      );
      if (!resultado || typeof resultado !== 'object' || !Array.isArray((resultado as any).data)) {
        return res.status(200).json({ total: 0, totalValor: 0 });
      }

      const data = (resultado.data || []).map(normalizePedido);
      const filtered = applyFilters(data);
      
      const totalValor = filtered.reduce((sum: number, p: any) => {
        const v = p.VALOR_PEDIDO ?? p.VALOR_TOTAL ?? p.VALOR ?? p.valor ?? p.valor_total ?? 0;
        if (typeof v === 'number') return sum + v;
        if (typeof v === 'string') {
          const n = Number(v.replace(/\./g, '').replace(',', '.'));
          return sum + (isNaN(n) ? 0 : n);
        }
        return sum;
      }, 0);

      console.log(`[API Pedidos Externos] Stats: ${filtered.length} pedidos filtrados de ${data.length} retornados`);
      return res.status(200).json({
        total: filtered.length,
        totalValor
      });
    }

    console.log('[API Pedidos Externos] Chamando listarPedidos com filtros:', filtrosApi);
    let resultado;
    try {
      resultado = await listarPedidosExternos(
        filtrosApi,
        username,
        password
      );
      console.log('[API Pedidos Externos] Resposta listarPedidos:', resultado ? 'OK' : 'NULL', resultado?.total, Array.isArray(resultado?.data) ? resultado.data.length : 'N/A');
    } catch (apiError: any) {
      console.error('[API Pedidos Externos] Erro na API externa:', {
        message: apiError.message,
        response: apiError.response ? {
          status: apiError.response.status,
          statusText: apiError.response.statusText,
          data: apiError.response.data
        } : 'Sem resposta',
        config: apiError.config ? {
          url: apiError.config.url,
          method: apiError.config.method,
          params: apiError.config.params
        } : 'Sem configuração',
        stack: apiError.stack
      });
      return res.status(500).json({ 
        error: 'Erro na API externa', 
        details: apiError.message,
        status: apiError.response?.status,
        data: apiError.response?.data
      });
    }

    console.log('[API Pedidos Externos] Resultado recebido, processando...');

    if (!resultado || typeof resultado !== 'object' || !Array.isArray((resultado as any).data)) {
      console.error('[API Pedidos Externos] Resposta inválida:', resultado);
      return res.status(500).json({ error: 'Resposta inválida da API externa', resultado });
    }

    console.log('[API Pedidos Externos] Normalizando pedidos...');
    const baseData = (resultado.data || []).map(normalizePedido);
    const totalExterno = typeof resultado.total === 'number' ? resultado.total : null;
    
    console.log('[API Pedidos Externos] Aplicando filtros...');
    console.log('[API Pedidos Externos] Dados recebidos da API externa:', {
      totalExterno,
      dataLength: resultado.data.length,
      firstItem: resultado.data[0] ? Object.keys(resultado.data[0]).slice(0, 10) : 'Nenhum item'
    });
    
    filtrados = applyFilters(baseData);

    console.log(`[API Pedidos Externos] Após filtros: ${filtrados.length} de ${baseData.length} itens passaram (total externo: ${totalExterno}, fetchLimit: ${fetchLimit}, safeLimit: ${safeLimit})`);
    if (filtrados.length < baseData.length) {
      console.log('[API Pedidos Externos] Itens removidos pelos filtros:', baseData.length - filtrados.length);
    }

    // Ordenar por data (mais antiga primeiro)
    try {
      filtrados.sort((a, b) => {
        const refA = getRef(a);
        const refB = getRef(b);
        if (!refA && !refB) return 0;
        if (!refA) return 1;
        if (!refB) return -1;
        return refA.getTime() - refB.getTime();
      });
    } catch (error) {
      console.error('[API Pedidos Externos] Erro ao ordenar:', error);
    }

    const lim = safeLimit;
    const off = filtrosApi.offset ?? 0;
    let page = filtrados;

    const pageNeedsEnrich = page.some((p: any) => {
      const numeroNota = pickString(p.NUMERO_NOTA, p.IDENTIFICACAO_NFE);
      const cep = pickString(p.CEP, p.CEP_ENTREGA, p.CEP_CONS_FINAL);
      return !numeroNota || !p.NOME_BAIRRO_NOTA || !p.NOME_CIDADE || !p.ESTADO_DESTINO || !cep;
    });

    if (pageNeedsEnrich) {
      try {
        const refs = page.map((p: any) => getRef(p)).filter(Boolean) as Date[];
        const minRef = refs.length ? new Date(Math.min(...refs.map(r => r.getTime()))) : null;
        const maxRef = refs.length ? new Date(Math.max(...refs.map(r => r.getTime()))) : null;
        const inicioAp = data_inicio && typeof data_inicio === 'string'
          ? data_inicio
          : minRef
            ? formatDate(minRef)
            : formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
        const fimAp = data_fim && typeof data_fim === 'string'
          ? data_fim
          : maxRef
            ? formatDate(maxRef)
            : formatDate(new Date());

        const apMap = new Map<number, any>();
        const batchLimit = 200;
        const maxRecords = 5000;
        let currentOffset = 0;
        let guard = 0;
        while (currentOffset < maxRecords) {
          const apBatch = await listarApuracoesExternas(
            {
              data_inicio: inicioAp,
              data_fim: fimAp,
              limit: batchLimit,
              offset: currentOffset
            },
            username,
            password
          );
          const dataBatch = apBatch?.data || [];
          if (dataBatch.length === 0) break;
          dataBatch.forEach((a: any) => {
            const id = getApuracaoId(a);
            if (id !== null && !apMap.has(id)) {
              apMap.set(id, a);
            }
          });
          currentOffset += dataBatch.length;
          guard += 1;
          if (dataBatch.length < batchLimit) break;
          if (guard >= 50) break;
        }
        page = page.map((p: any) => {
          const ap = apMap.get(parseNumber(p.ORCAMENTO_ID) ?? -1);
          return enrichWithApuracao(p, ap);
        });
      } catch (error: any) {
        console.error('[API Pedidos Externos] Falha ao enriquecer apurações:', error?.message || error);
      }
    }

    const payload = {
      data: page,
      total: filtrados.length,
      limit: lim,
      offset: off
    };
    
    return res.status(200).json(payload);
    */

  } catch (error: any) {
    console.error('[API Pedidos Externos] Erro interno:', error.message || error);
    console.error('[API Pedidos Externos] Stack:', error.stack);
    
    return res.status(500).json({
      error: 'Erro interno ao processar requisição',
      message: error.message || 'Erro desconhecido',
      details: error.response?.data || error.stack,
      stack: error.stack
    });
  }
}
