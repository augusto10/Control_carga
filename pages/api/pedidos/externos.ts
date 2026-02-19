import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../../services/api-externa';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
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
      tipo_data
    } = req.query;

    const tipoData = typeof tipo_data === 'string' 
      ? tipo_data.toLowerCase() 
      : 'recebimento';

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      console.error('[API Pedidos Externos] Credenciais da API externa não configuradas');
      return res.status(500).json({
        error: 'Credenciais da API externa não configuradas',
        details: 'Configure API_EXTERNA_USERNAME e API_EXTERNA_PASSWORD no .env.local'
      });
    }

    console.log('[API Pedidos Externos] Parâmetros recebidos:', {
      data_inicio,
      data_fim,
      limit,
      offset
    });

    const requestedLimit = limit ? parseInt(limit as string, 10) : 100;
    const safeLimit = Number.isFinite(requestedLimit) ? Math.min(requestedLimit, 100) : 100;
    const filtrosApi: any = {
      limit: safeLimit,
      offset: offset ? parseInt(offset as string, 10) : 0
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

    console.log('[API Pedidos Externos] Filtros para a API:', filtrosApi);

    const inicio = data_inicio && typeof data_inicio === 'string' ? new Date(`${data_inicio}T00:00:00`) : null;
    const fim = data_fim && typeof data_fim === 'string' ? new Date(`${data_fim}T23:59:59`) : null;
    const tiposEntrega = typeof tipo_entrega === 'string' ? tipo_entrega.split(',').map(s => s.trim().toUpperCase()) : null;
    const statusFechado = typeof status === 'string' ? status.toUpperCase() : null;
    const searchTerm = typeof search === 'string' ? search.trim().toLowerCase() : '';

    const pickString = (...values: Array<unknown>) => {
      for (const value of values) {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed) return trimmed;
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

    const parseDate = (v: any) => {
      if (!v) return null;
      const s = String(v).trim();
      if (!s) return null;
      if (/^\d+$/.test(s)) {
        const d = new Date(Number(s));
        return isNaN(d.getTime()) ? null : d;
      }
      if (s.includes('T')) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
        const [datePart, timePart] = s.split(' ');
        const [day, month, year] = datePart.split('/').map((n) => Number(n));
        const [hh = 0, mm = 0, ss = 0] = (timePart || '').split(':').map((n) => Number(n));
        const d = new Date(year, (month || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0);
        return isNaN(d.getTime()) ? null : d;
      }
      if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
        const [datePart, timePart] = s.split(' ');
        const [day, month, year] = datePart.split('-').map((n) => Number(n));
        const [hh = 0, mm = 0, ss = 0] = (timePart || '').split(':').map((n) => Number(n));
        const d = new Date(year, (month || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0);
        return isNaN(d.getTime()) ? null : d;
      }
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
      const [datePart, timePart] = s.split(' ');
      const [year, month, day] = datePart.split('-').map((n) => Number(n));
      const [hh = 0, mm = 0, ss = 0] = timePart.split(':').map((n) => Number(n));
      const d = new Date(year, (month || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0);
      return isNaN(d.getTime()) ? null : d;
    }
      if (/^\d{4}\/\d{2}\/\d{2}/.test(s)) {
        const [datePart, timePart] = s.split(' ');
        const [year, month, day] = datePart.split('/').map((n) => Number(n));
        const [hh = 0, mm = 0, ss = 0] = (timePart || '').split(':').map((n) => Number(n));
        const d = new Date(year, (month || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0);
        return isNaN(d.getTime()) ? null : d;
      }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };
    const getRef = (p: any) => {
      if (tipoData === 'entrega') {
        return (
          parseDate(p.DATA_ENTREGA) ||
          parseDate(p.data_entrega) ||
          null
        );
      }

      // padrão = recebimento
      return (
        parseDate(p.DATA_HORA_RECEBIMENTO) ||
        parseDate(p.data_hora_recebimento) ||
        parseDate(p.DATA_RECEBIMENTO) ||
        parseDate(p.data_recebimento) ||
        null
      );
    };

    const EMPRESA_ID_ALVO = 1;
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
        p.BAIRRO,
        p.NOME_BAIRRO,
        p.BAIRRO_ENTREGA
      );
      const nomeCidade = pickString(
        p.NOME_CIDADE,
        p.CIDADE,
        p.CIDADE_ENTREGA,
        p.MUNICIPIO
      );
      const estadoDestino = pickString(
        p.ESTADO_DESTINO,
        p.UF,
        p.UF_ENTREGA,
        p.ESTADO
      );
      const logradouroEntrega = pickString(
        p.LOGRADOURO_ENTREGA,
        p.LOGRADOURO,
        p.RUA,
        p.ENDERECO,
        p.ENDERECO_ENTREGA,
        p.ENDERECO_COMPLETO
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
        p.CEP_DESTINO
      );
      return {
        ...p,
        NUMERO_NOTA: numeroNota ?? p.NUMERO_NOTA ?? null,
        IDENTIFICACAO_NFE: identificacaoNfe ?? p.IDENTIFICACAO_NFE ?? null,
        NOME_BAIRRO_NOTA: nomeBairroNota ?? p.NOME_BAIRRO_NOTA ?? null,
        NOME_CIDADE: nomeCidade ?? p.NOME_CIDADE ?? null,
        ESTADO_DESTINO: estadoDestino ?? p.ESTADO_DESTINO ?? null,
        LOGRADOURO_ENTREGA: logradouroEntrega ?? p.LOGRADOURO_ENTREGA ?? null,
        COMPLEMENTO_ENTREGA: complementoEntrega ?? p.COMPLEMENTO_ENTREGA ?? null,
        CEP: cep ?? p.CEP ?? p.CEP_ENTREGA ?? p.CEP_CONS_FINAL ?? null
      };
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
        ap.BAIRRO,
        ap.NOME_BAIRRO,
        ap.BAIRRO_ENTREGA
      );
      const nomeCidade = pickString(
        ap.NOME_CIDADE,
        ap.CIDADE,
        ap.CIDADE_ENTREGA,
        ap.MUNICIPIO
      );
      const estadoDestino = pickString(
        ap.ESTADO_DESTINO,
        ap.UF,
        ap.UF_ENTREGA,
        ap.ESTADO
      );
      const logradouroEntrega = pickString(
        ap.LOGRADOURO,
        ap.LOGRADOURO_ENTREGA,
        ap.RUA,
        ap.ENDERECO,
        ap.ENDERECO_ENTREGA,
        ap.ENDERECO_COMPLETO
      );
      const complementoEntrega = pickString(
        ap.COMPLEMENTO,
        ap.COMPLEMENTO_ENTREGA
      );
      const cep = pickString(
        ap.CEP,
        ap.CEP_ENTREGA,
        ap.CEP_CONS_FINAL,
        ap.CEP_DESTINO
      );
      return normalizePedido({
        ...p,
        NUMERO_NOTA: numeroNota ?? p.NUMERO_NOTA,
        IDENTIFICACAO_NFE: identificacaoNfe ?? p.IDENTIFICACAO_NFE,
        NOME_BAIRRO_NOTA: nomeBairroNota ?? p.NOME_BAIRRO_NOTA,
        NOME_CIDADE: nomeCidade ?? p.NOME_CIDADE,
        ESTADO_DESTINO: estadoDestino ?? p.ESTADO_DESTINO,
        LOGRADOURO_ENTREGA: logradouroEntrega ?? p.LOGRADOURO_ENTREGA,
        COMPLEMENTO_ENTREGA: complementoEntrega ?? p.COMPLEMENTO_ENTREGA,
        CEP: cep ?? p.CEP ?? p.CEP_ENTREGA ?? p.CEP_CONS_FINAL
      });
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

        if (tiposEntrega && tiposEntrega.length > 0) {
          const te = String(p.TIPO_ENTREGA || '').toUpperCase();
          const isEntrega = tiposEntrega.includes(te);
          if (!isEntrega) return false;
        }
        if (statusFechado) {
          const fechado = String(p.PEDIDO_FECHADO || '').toUpperCase() === 'S';
          const cancelado = String(p.CANCELADO || '').toUpperCase() === 'S';
          if (statusFechado === 'FECHADO' && (!fechado || cancelado)) return false;
        }
        if (searchTerm) {
          const campos = [
            p.CLIENTE_NOME,
            p.NOME_FANTASIA,
            p.VENDEDOR_NOME,
            p.NUMERO_NOTA || '',
            p.IDENTIFICACAO_NFE || '',
            String(p.ORCAMENTO_ID || '')
          ].map((x: any) => String(x || '').toLowerCase());
          if (!campos.some((c: string) => c.includes(searchTerm))) return false;
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

    let filtrados: any[] = [];

    if (stats === '1') {
      // Se estamos pedindo stats, queremos o total filtrado para o período
      const resultado = await apiExternaService.listarPedidos(
        filtrosApi,
        username,
        password
      );
      if (!resultado || typeof resultado !== 'object' || !Array.isArray((resultado as any).data)) {
        return res.status(200).json({ total: 0, totalValor: 0 });
      }

      // IMPORTANTE: Para o card mostrar o valor correto do dia/período, 
      // precisamos aplicar o filtro local de empresa e qualquer outro filtro de negócio
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

      return res.status(200).json({
        total: filtered.length, // Usar o tamanho do array filtrado localmente
        totalValor
      });
    }

    const resultado = await apiExternaService.listarPedidos(
      filtrosApi,
      username,
      password
    );

    if (!resultado || typeof resultado !== 'object' || !Array.isArray((resultado as any).data)) {
      return res.status(500).json({ error: 'Resposta inválida da API externa' });
    }

    const baseData = (resultado.data || []).map(normalizePedido);
    const totalExterno = typeof resultado.total === 'number' ? resultado.total : null;
    filtrados = applyFilters(baseData);

    const lim = filtrosApi.limit ?? 100;
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
          const apBatch = await apiExternaService.listarApuracoes(
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
      total: totalExterno ?? page.length,
      limit: lim,
      offset: off
    };
    
    return res.status(200).json(payload);

  } catch (error: any) {
    console.error('[API Pedidos Externos] Erro interno:', error.message || error);
    
    return res.status(500).json({
      error: 'Erro interno ao processar requisição',
      message: error.message || 'Erro desconhecido',
      details: error.response?.data || error.stack
    });
  }
}
