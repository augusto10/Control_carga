import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../../services/api-externa';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { 
      data_inicio, 
      data_fim, 
      limit = '50', 
      offset = '0' 
    } = req.query;

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

    const filtros: any = {
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0
    };

    if (data_inicio && typeof data_inicio === 'string' && data_inicio !== 'undefined') {
      filtros.data_inicio = data_inicio;
    }
    if (data_fim && typeof data_fim === 'string' && data_fim !== 'undefined') {
      filtros.data_fim = data_fim;
    }

    console.log('[API Pedidos Externos] Filtros processados para a API:', filtros);

    const resultado = await apiExternaService.listarPedidos(
      filtros,
      username,
      password
    );

    if (!resultado) {
      console.error('[API Pedidos Externos] A API externa retornou null ou erro');
      return res.status(500).json({
        error: 'Erro ao buscar pedidos na API externa',
        details: 'A API externa retornou um erro ou não respondeu'
      });
    }

    console.log(`[API Pedidos Externos] Sucesso: ${resultado.data?.length || 0} pedidos encontrados de um total de ${resultado.total || 0}`);
    
    if ((filtros.data_inicio || filtros.data_fim) && ((resultado.data?.length || 0) === 0 || (resultado.total || 0) === 0)) {
      const fallback = await apiExternaService.listarPedidos(
        { limit: 10000, offset: 0 },
        username,
        password
      );
      if (fallback && Array.isArray(fallback.data)) {
        const inicio = filtros.data_inicio ? new Date(`${filtros.data_inicio}T00:00:00`) : null;
        const fim = filtros.data_fim ? new Date(`${filtros.data_fim}T23:59:59`) : null;
        const parseDate = (v: any) => {
          if (!v) return null;
          const s = String(v);
          if (/^\d+$/.test(s)) {
            const d = new Date(Number(s));
            return isNaN(d.getTime()) ? null : d;
          }
          if (s.includes('T')) {
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
          }
          const d = new Date(s);
          return isNaN(d.getTime()) ? null : d;
        };
        const getRef = (p: any) => {
          return (
            parseDate(p.DATA_HORA_RECEBIMENTO) ||
            parseDate(p.DATA_RECEBIMENTO) ||
            parseDate(p.DATA_HORA_CADASTRO) ||
            parseDate(p.DATA_CADASTRO) ||
            parseDate(p.DATA_ENTREGA) ||
            parseDate(p.DATA_PEDIDO) ||
            parseDate(p.DATA) ||
            parseDate(p.EMISSAO)
          );
        };
        const filtrados = fallback.data.filter((p: any) => {
          if (!inicio || !fim) return true;
          const ref = getRef(p);
          return !!ref && ref >= inicio && ref <= fim;
        });
        const lim = filtros.limit ?? 50;
        const off = filtros.offset ?? 0;
        const page = filtrados.slice(off, off + lim);
        return res.status(200).json({
          data: page,
          total: filtrados.length,
          limit: lim,
          offset: off
        });
      }
    }
    
    return res.status(200).json(resultado);

  } catch (error: any) {
    console.error('[API Pedidos Externos] Erro interno:', error.message || error);
    
    return res.status(500).json({
      error: 'Erro interno ao processar requisição',
      message: error.message || 'Erro desconhecido',
      details: error.response?.data || error.stack
    });
  }
}
