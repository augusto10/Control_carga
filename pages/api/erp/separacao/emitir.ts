import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { emitirListaSeparacaoNoErp } from '@/lib/erp-separacao-automation';

type ApiResponse =
  | {
      success: true;
      message: string;
      pedidos: string[];
      automation: Record<string, unknown> | null;
      stdout: string;
      stderr: string;
    }
  | {
      success: false;
      message: string;
      details?: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      message: 'Metodo nao permitido.',
    });
  }

  try {
    const user = await getAuthenticatedUser(req);

    if (!user || !user.ativo) {
      return res.status(401).json({
        success: false,
        message: 'Usuario nao autenticado.',
      });
    }

    const pedidoIds = Array.isArray(req.body?.pedidoIds)
      ? req.body.pedidoIds
      : req.body?.pedidoId
        ? [req.body.pedidoId]
        : [];

    const result = await emitirListaSeparacaoNoErp({ pedidoIds });

    if (!result.ok) {
      return res.status(502).json({
        success: false,
        message: 'A automacao do ERP retornou erro.',
        details: result.stderr || result.stdout || 'Sem detalhes retornados pelo script.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Emissao enviada ao ERP para ${result.pedidos.length} pedido(s).`,
      pedidos: result.pedidos,
      automation: result.parsedOutput ?? null,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || 'Falha ao emitir lista de separacao no ERP.',
      details: error?.stack,
    });
  }
}
