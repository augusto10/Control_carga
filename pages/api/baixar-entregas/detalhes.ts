import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

const SUPERVISOR_ROLES = new Set(['ADMIN', 'GERENTE']);

const normalizeName = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const pick = (...values: unknown[]) =>
  values.find(
    (value) => value !== null && value !== undefined && String(value).trim() !== ''
  );

const pickString = (...values: unknown[]) => {
  const value = pick(...values);
  return value === undefined ? null : String(value);
};

const pickPedidoId = (...values: unknown[]) => {
  const value = pick(...values);
  return value === undefined
    ? null
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : String(value);
};

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const controleId = String(req.query.controleId || '').trim();
    const notaId = String(req.query.notaId || '').trim();
    if (!controleId || !notaId) {
      return res.status(400).json({ message: 'Controle e nota são obrigatórios' });
    }

    const [user, controle] = await Promise.all([
      prisma.usuario.findUnique({
        where: { id: req.user.id },
        select: { nome: true, tipo: true, ativo: true },
      }),
      prisma.controleCarga.findUnique({
        where: { id: controleId },
        include: { notas: true },
      }),
    ]);

    if (!user?.ativo) {
      return res.status(401).json({ message: 'Usuário não autenticado ou inativo' });
    }
    if (!controle?.finalizado) {
      return res.status(404).json({ message: 'Controle finalizado não encontrado' });
    }
    if (
      !SUPERVISOR_ROLES.has(user.tipo) &&
      normalizeName(controle.motorista) !== normalizeName(user.nome)
    ) {
      return res.status(403).json({ message: 'Este controle não pertence ao motorista logado' });
    }

    const nota = controle.notas.find((item) => item.id === notaId);
    if (!nota) {
      return res.status(404).json({ message: 'Nota não encontrada neste controle' });
    }

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;
    let external: any = null;

    if (username && password) {
      const accessKey = String(nota.codigo || '').replace(/\D/g, '');
      external =
        accessKey.length === 44
          ? await apiExternaService.buscarNotaFiscalPorChave(accessKey, username, password)
          : await apiExternaService.buscarNotaFiscalPorNumeroSerie(
              nota.numeroNota,
              '1',
              username,
              password
            );
    }

    const fiscal = external?.nota_fiscal || external?.notaFiscal || {};
    const order = external?.pedido || external?.pedido_venda || {};
    const data = { ...(external || {}), ...order, ...fiscal };
    const pedidoId =
      pickPedidoId(
        data.ORCAMENTO_ID,
        data.orcamento_id,
        data.PEDIDO_ID,
        data.pedido_id,
        data.id
      ) || null;

    let logistica: Record<string, any> | null = null;
    if (pedidoId !== null && username && password) {
      logistica = await apiExternaService.buscarPedidoLogistica(pedidoId, username, password);
    }

    const pedidoLogistica = (logistica?.pedido || {}) as Record<string, any>;
    const notaFiscalLogistica = Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0] || {} : {};
    const merged = { ...data, ...pedidoLogistica, ...notaFiscalLogistica };

    return res.status(200).json({
      id: nota.id,
      numeroNota: nota.numeroNota,
      codigo: nota.codigo,
      codigoCliente:
        pick(
          merged.CLIENTE_ID,
          merged.CLIENTE_CODIGO,
          merged.CODIGO_CLIENTE,
          merged.COD_CLIENTE,
          merged.cliente?.codigo,
          merged.cliente?.id
        ) || null,
      volumes: Number(nota.volumes) || 0,
      cliente:
        pick(
          merged.CLIENTE_NOME,
          merged.NOME_FANTASIA,
          merged.NOME_RAZAO_SOCIAL,
          merged.razaoSocial,
          merged.cliente?.nome
        ) || nota.codigo || 'Cliente não identificado',
      valor:
        Number(
          pick(merged.VALOR_TOTAL_NOTA, merged.VALOR_PEDIDO, merged.VALOR_TOTAL, merged.valor)
        ) || 0,
      pedidoId,
      numeroPedido:
        pickString(
          merged.NUMERO_PEDIDO,
          merged.numero_pedido,
          merged.PEDIDO_NUMERO,
          pedidoLogistica.NUMERO_ORCAMENTO,
          pedidoLogistica.ORCAMENTO_NUMERO
        ) || null,
      vendedor:
        pickString(
          merged.VENDEDOR_NOME,
          merged.NOME_REPRESENTANTE,
          merged.VENDEDOR,
          merged.REPRESENTANTE_NOME
        ) || null,
    });
  } catch (error: any) {
    console.error('[Baixar Entregas] Erro ao carregar detalhes:', error);
    return res.status(500).json({
      message: 'Erro ao carregar os detalhes do pedido',
      details: error?.message || 'Erro interno',
    });
  }
}

export default withAuth(handler);
