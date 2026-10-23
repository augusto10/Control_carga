import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withTotemOrAuth } from '@/lib/middleware/withTotemOrAuth';
import automationPrisma from '@/lib/automation-prisma';
import { calcularFilaSeparacao } from '@/lib/separacao-fila';

const JOB_TYPE = 'IMPRIMIR_LISTA_SEPARACAO';

/**
 * Fase automação: o totem envia codigoAdm/senhaAdm e o endpoint apenas
 * enfileira um job IMPRIMIR_LISTA_SEPARACAO para o agente — quem valida
 * as credenciais e registra a separação no ERP é o próprio job.
 */

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  try {
    const codigoAdm = Number(req.body?.codigoAdm);
    const senhaAdm = typeof req.body?.senhaAdm === 'string' ? req.body.senhaAdm : '';

    if (!Number.isInteger(codigoAdm) || !senhaAdm) {
      return res.status(400).json({ success: false, message: 'Informe codigoAdm e senhaAdm.' });
    }

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;
    if (!username || !password) {
      return res.status(500).json({ success: false, message: 'Credenciais da API externa não configuradas' });
    }

    const fila = await calcularFilaSeparacao({ username, password });
    const proximo = fila[0];

    if (!proximo) {
      return res.status(404).json({ success: false, message: 'Não há pedidos aguardando separação.' });
    }

    const job = await automationPrisma.job.create({
      data: {
        type: JOB_TYPE,
        payload: {
          pedidoId: proximo.pedidoId,
          admCodigoSeparador: codigoAdm,
          admSenhaSeparador: senhaAdm,
        },
      },
      select: { id: true, type: true, status: true },
    });

    // TODO(pós-automação): voltar a gravar a associação quando o job
    // confirmar sucesso no ERP. Hoje Pedidos não é escrito, então a faixa
    // "separando agora" (/api/separacao/ativas) fica vazia.
    //
    // const associacao = await prisma.pedidos.create({
    //   data: { pedidoId: proximo.pedidoId, usuarioId: separador.id },
    //   select: { id: true, pedidoId: true },
    // });
    // await prisma.pedidos.update({
    //   where: { id: associacao.id },
    //   data: { jobId: job.id },
    // });

    return res.status(201).json({
      success: true,
      job: { id: job.id, type: job.type, status: job.status },
      pedido: proximo,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({ success: false, message });
  }
}

export default withTotemOrAuth(handler);
