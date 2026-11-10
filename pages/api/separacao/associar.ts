import type { NextApiResponse } from 'next';
import type { AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withTotemOrAuth } from '@/lib/middleware/withTotemOrAuth';
import automationPrisma from '@/lib/automation-prisma';
import prisma from '@/lib/prisma';
import { calcularFilaSeparacao } from '@/lib/separacao-fila';
import {
  buscarSeparadorPorBiometria,
  validarSeparador,
  type SeparadorValido,
} from '@/lib/separador-credenciais';

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
    const biometria =
      typeof req.body?.biometria === 'string' ? req.body.biometria.trim() : '';
    const codigoAdm = Number(req.body?.codigoAdm);
    const senhaAdm = typeof req.body?.senhaAdm === 'string' ? req.body.senhaAdm : '';
    const pedidoIdRecebido = Number(req.body?.pedidoId);
    const pedidoIdValido = Number.isInteger(pedidoIdRecebido) && pedidoIdRecebido > 0;

    // Autenticação do separador: biometria primeiro (quando o leitor estiver
    // integrado); fallback para o par codigoAdm + senhaAdm digitado no totem.
    // As credenciais enviadas no payload do job saem sempre do Usuario
    // resolvido — nunca do body — para o job levar as credenciais ADM dele.
    let separador: SeparadorValido | null;
    if (biometria) {
      separador = await buscarSeparadorPorBiometria(biometria);
      if (!separador) {
        return res
          .status(401)
          .json({ success: false, message: 'Biometria não reconhecida. Use código e senha.' });
      }
    } else {
      if (!Number.isInteger(codigoAdm) || !senhaAdm) {
        return res.status(400).json({ success: false, message: 'Informe codigoAdm e senhaAdm.' });
      }
      separador = await validarSeparador(codigoAdm, senhaAdm);
      if (!separador) {
        return res
          .status(401)
          .json({ success: false, message: 'Código ADM ou senha inválidos.' });
      }
    }

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;
    if (!username || !password) {
      return res.status(500).json({ success: false, message: 'Credenciais da API externa não configuradas' });
    }

    // A tela /separacao já mantém o próximo pedido em memória (polling de
    // /api/separacao/fila). Quando ele chega aqui, evitamos recalcular a
    // fila inteira (pipeline cara de dashboard/API externa) só para achar
    // o mesmo pedidoId de novo — isso é o que deixava a modal lenta.
    let proximo: { pedidoId: number } | undefined = pedidoIdValido
      ? { pedidoId: pedidoIdRecebido }
      : undefined;

    if (!proximo) {
      const fila = await calcularFilaSeparacao({ username, password });
      proximo = fila[0];
    }

    if (!proximo) {
      return res.status(404).json({ success: false, message: 'Não há pedidos aguardando separação.' });
    }

    const conflito = await prisma.pedidos.findFirst({
      where: {
        status: 'EM_SEPARACAO',
        OR: [{ pedidoId: proximo.pedidoId }, { usuarioId: separador.id }],
      },
      select: { pedidoId: true, usuarioId: true },
    });
    if (conflito) {
      return res.status(409).json({
        success: false,
        message:
          conflito.usuarioId === separador.id
            ? `Você já tem uma separação em andamento (pedido ${conflito.pedidoId}).`
            : 'Pedido já está em separação.',
      });
    }

    // Fallback de corrida: dois totens podem passar pela checagem acima
    // ao mesmo tempo — o índice único parcial (status EM_SEPARACAO) trava
    // o segundo com P2002 e respondemos 409 em vez de 500.
    const associacao = await prisma.pedidos
      .create({
        data: { pedidoId: proximo.pedidoId, usuarioId: separador.id },
        select: { id: true },
      })
      .catch(async (err) => {
        if (err?.code === 'P2002') return null;
        throw err;
      });
    if (!associacao) {
      return res.status(409).json({
        success: false,
        message: 'Conflito: pedido ou separador já possui separação em andamento.',
      });
    }

    try {
      const job = await automationPrisma.job.create({
        data: {
          type: JOB_TYPE,
          payload: {
            pedidoId: proximo.pedidoId,
            admCodigoSeparador: separador.codigoAdm,
            admSenhaSeparador: separador.senhaAdm,
          },
        },
        select: { id: true, type: true, status: true },
      });

      await prisma.pedidos.update({
        where: { id: associacao.id },
        data: { jobId: job.id },
      });

      return res.status(201).json({
        success: true,
        job: { id: job.id, type: job.type, status: job.status },
        pedido: proximo,
        separador: { id: separador.id, nome: separador.nome },
      });
    } catch (erroJob) {
      // Job não criado: remove o Pedidos para o item não ficar preso
      // como EM_SEPARACAO (fora da fila) sem job associado.
      await prisma.pedidos
        .delete({ where: { id: associacao.id } })
        .catch(() => undefined);
      throw erroJob;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return res.status(500).json({ success: false, message });
  }
}

export default withTotemOrAuth(handler);
