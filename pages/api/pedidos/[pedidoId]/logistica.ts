import type { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '@/services/api-externa';

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

const mergePedidoComLogistica = (pedidoBase: Record<string, any>, logistica: Record<string, any> | null) => {
  const pedidoLogistica = (logistica?.pedido || {}) as Record<string, any>;
  const notaFiscal = Array.isArray(logistica?.notas_fiscais) ? logistica!.notas_fiscais[0] || {} : {};
  const entrega = Array.isArray(logistica?.entregas) ? logistica!.entregas[0] || {} : {};

  return {
    ...pedidoBase,
    ...pedidoLogistica,
    NUMERO_NOTA:
      pickString(
        pedidoLogistica.NUMERO_NOTA,
        notaFiscal.NUMERO_NOTA,
        pedidoBase.NUMERO_NOTA
      ) ?? null,
    IDENTIFICACAO_NFE:
      pickString(
        pedidoLogistica.IDENTIFICACAO_NFE,
        notaFiscal.IDENTIFICACAO_NFE,
        pedidoBase.IDENTIFICACAO_NFE
      ) ?? null,
    NOME_BAIRRO_NOTA:
      pickString(
        pedidoLogistica.BAIRRO_ENTREGA_NOME,
        pedidoLogistica.BAIRRO_CADASTRO_NOME,
        pedidoBase.NOME_BAIRRO_NOTA,
        pedidoBase.BAIRRO
      ) ?? null,
    NOME_CIDADE:
      pickString(
        pedidoLogistica.CIDADE_ENTREGA_NOME,
        pedidoLogistica.CIDADE_CADASTRO_NOME,
        pedidoBase.NOME_CIDADE,
        pedidoBase.CIDADE
      ) ?? null,
    ESTADO_DESTINO:
      pickString(
        pedidoLogistica.ESTADO_ENTREGA_ID,
        pedidoLogistica.UF_ENTREGA,
        pedidoLogistica.ESTADO_CADASTRO_ID,
        pedidoLogistica.UF_CADASTRO,
        pedidoBase.ESTADO_DESTINO,
        pedidoBase.UF
      ) ?? null,
    CEP:
      pickString(
        pedidoLogistica.CEP_ENTREGA,
        pedidoBase.CEP,
        pedidoBase.CEP_ENTREGA,
        pedidoBase.CEP_CONS_FINAL
      ) ?? null,
    TIPO_ENTREGA:
      pickString(
        pedidoLogistica.TIPO_ENTREGA,
        entrega.ENTREGA_NO_ATO === 'S' ? 'ATO' : null,
        pedidoBase.TIPO_ENTREGA
      ) ?? null,
    RECEBIDO:
      pickString(pedidoLogistica.RECEBIDO, pedidoBase.RECEBIDO) ?? null,
    DATA_HORA_RECEBIMENTO:
      pickString(
        pedidoLogistica.DATA_HORA_RECEBIMENTO,
        pedidoBase.DATA_HORA_RECEBIMENTO
      ) ?? null,
    _logistica: logistica,
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { pedidoId } = req.query;
  const id = Array.isArray(pedidoId) ? pedidoId[0] : pedidoId;

  if (!id) {
    return res.status(400).json({ error: 'pedidoId é obrigatório' });
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;

  if (!username || !password) {
    return res.status(500).json({ error: 'Credenciais da API externa não configuradas' });
  }

  try {
    const logistica = await apiExternaService.buscarPedidoLogistica(id, username, password);

    if (!logistica) {
      return res.status(404).json({ error: 'Logística do pedido não encontrada' });
    }

    const pedidoDetalhado = mergePedidoComLogistica({}, logistica as Record<string, any>);
    return res.status(200).json({ pedido: pedidoDetalhado, logistica });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Erro ao buscar logística do pedido',
      details: error?.message || 'Erro desconhecido',
    });
  }
}
