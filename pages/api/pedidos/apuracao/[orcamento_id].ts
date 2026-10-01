import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../../../services/api-externa';

function pickNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  const { orcamento_id } = req.query;

  if (!orcamento_id || typeof orcamento_id !== 'string') {
    return res.status(400).json({ error: 'orcamento_id e obrigatorio' });
  }

  try {
    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      return res.status(500).json({ error: 'Credenciais da API externa nao configuradas' });
    }

    const inicio = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fim = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const apuracoes = await apiExternaService.listarApuracoes(
      {
        data_inicio: inicio,
        data_fim: fim,
        limit: 1000,
        offset: 0,
      },
      username,
      password
    );

    if (!apuracoes || !Array.isArray(apuracoes.data)) {
      return res.status(404).json({ error: 'Nenhuma apuracao encontrada' });
    }

    const alvo = Number(orcamento_id);
    const apuracao = apuracoes.data.find((item: any) => {
      return [item.ORCAMENTO_BASE_ID, item.ORCAMENTO_ID, item.ORCAMENTO]
        .map(pickNumber)
        .some((value) => value === alvo);
    });

    if (!apuracao) {
      return res.status(404).json({ error: 'Apuracao nao encontrada para este pedido' });
    }

    return res.status(200).json({
      NUMERO_NOTA: apuracao.NUMERO_NOTA ?? null,
      IDENTIFICACAO_NFE: apuracao.IDENTIFICACAO_NFE ?? null,
      DATA_EMISSAO: apuracao.DATA_EMISSAO ?? null,
      VALOR_TOTAL_NOTA: (apuracao as any).VALOR_TOTAL_NOTA ?? null,
    });
  } catch (error: any) {
    console.error('[API Apuracao por ID] Erro:', error?.message || error);
    return res.status(500).json({ error: 'Erro interno ao buscar apuracao' });
  }
}
