import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../../services/api-externa';

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
      tipo_data
    } = req.query;

    const tipoData = typeof tipo_data === 'string' 
      ? tipo_data.toLowerCase() 
      : 'recebimento';

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
    const fetchLimit = safeLimit;
    const filtrosApi: any = {
      limit: fetchLimit,
      offset: stats === '1' ? 0 : (offset ? parseInt(offset as string, 10) : 0)
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
        const d = new Date(s);
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
          parseDate(p.data_recebimento)
        );
      } catch (error) {
        console.error('[API Pedidos Externos] Erro ao parsear data:', error, p);
        return null;
      }
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
      if (p.NUMERO_NOTA === '186911' || !nomeCidade) {
        console.log(`[API Debug] Nota ${p.NUMERO_NOTA}: Bairro=${nomeBairroNota}, Cidade=${nomeCidade}, Estado=${estadoDestino}`);
      }

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
      resultado = await apiExternaService.listarPedidos(
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
      total: filtrados.length,
      limit: lim,
      offset: off
    };
    
    return res.status(200).json(payload);

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
