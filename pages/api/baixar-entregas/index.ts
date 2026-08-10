import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

const CONFIRMATION_PREFIX = 'entrega_confirmacao:';
const SUPERVISOR_ROLES = new Set(['ADMIN', 'GERENTE']);
const THIRD_PARTY_CARRIERS = ['TERCEIRIZADA'] as const;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const normalizeNota = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.replace(/^0+/, '') || '0';
};

const normalizeName = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'MÃ©todo nÃ£o permitido' });
  }

  try {
    const user = await prisma.usuario.findUnique({
      where: { id: req.user.id },
      select: { id: true, nome: true, email: true, tipo: true, ativo: true },
    });
    if (!user?.ativo) {
      return res.status(401).json({ message: 'UsuÃ¡rio nÃ£o autenticado ou inativo' });
    }

    const isSupervisor = SUPERVISOR_ROLES.has(user.tipo);
    const dataInicio = first(req.query.dataInicio);
    const dataFim = first(req.query.dataFim);
    const status = first(req.query.status) || 'TODOS';
    const search = (first(req.query.busca) || '').trim().toLowerCase();
    const motoristaFiltro = (first(req.query.motorista) || '').trim();

    const where: any = {
      finalizado: true,
      transportadora: { in: [...THIRD_PARTY_CARRIERS] },
    };

    if (dataInicio || dataFim) {
      where.dataCriacao = {};
      if (dataInicio) where.dataCriacao.gte = new Date(`${dataInicio}T00:00:00-03:00`);
      if (dataFim) where.dataCriacao.lte = new Date(`${dataFim}T23:59:59.999-03:00`);
    }

    if (isSupervisor && motoristaFiltro) {
      where.motorista = { contains: motoristaFiltro, mode: 'insensitive' };
    } else if (!isSupervisor) {
      where.motorista = { contains: user.nome, mode: 'insensitive' };
    }

    const controlesDb = await prisma.controleCarga.findMany({
      where,
      include: { notas: true },
      orderBy: { dataCriacao: 'desc' },
    });

    const controlesFiltrados = isSupervisor
      ? controlesDb
      : controlesDb.filter(
          (controle) => normalizeName(controle.motorista) === normalizeName(user.nome)
        );
    // Motoristas veem somente os tres controles mais recentes por padrao.
    // Quando informam um periodo, a busca respeita o periodo escolhido para
    // permitir a consulta de historico sem alterar a visao dos supervisores.
    const controles = !isSupervisor && !dataInicio && !dataFim
      ? controlesFiltrados.slice(0, 3)
      : controlesFiltrados;

    const controleIds = controles.map((controle) => controle.id);
    const confirmationRows = controleIds.length
      ? await prisma.configuracaoSistema.findMany({
          where: { chave: { startsWith: CONFIRMATION_PREFIX } },
          select: { valor: true },
        })
      : [];
    const confirmationControlIds = new Set(controleIds);
    const confirmacoes = confirmationRows.flatMap((row) => {
      try {
        const item = JSON.parse(row.valor);
        if (!confirmationControlIds.has(String(item.controleId || ''))) return [];
        return [{ ...item, temFoto: Boolean(item.fotoComprovante), fotoComprovante: undefined }];
      } catch {
        return [];
      }
    });

    const confirmationMap = new Map(
      confirmacoes.map((item) => [`${item.controleId}:${normalizeNota(item.numeroNota)}`, item])
    );
    const entregas = (
      await Promise.all(
        controles.map(async (controle) => {
          const notas = await Promise.all(
            controle.notas.map(async (nota) => {
              const confirmation = confirmationMap.get(
                `${controle.id}:${normalizeNota(nota.numeroNota)}`
              );

              const resolvedDetails = {
                cliente: nota.codigo || 'Cliente não identificado',
                codigoCliente: null,
                pedidoId: null,
                numeroPedido: null,
                vendedor: null,
              };

              return {
                id: nota.id,
                numeroNota: nota.numeroNota,
                codigo: nota.codigo,
                codigoCliente: resolvedDetails.codigoCliente,
                volumes: Number(nota.volumes) || 0,
                cliente: resolvedDetails.cliente,
                valor: 0,
                pedidoId: resolvedDetails.pedidoId,
                numeroPedido: resolvedDetails.numeroPedido,
                vendedor: resolvedDetails.vendedor,
                status: confirmation?.entregue ? 'ENTREGUE' : 'PENDENTE',
                confirmacao: confirmation?.entregue
                  ? {
                      dataConfirmacao: confirmation.dataConfirmacao
                        ? new Date(confirmation.dataConfirmacao).toISOString()
                        : null,
                      confirmadoPor: confirmation.confirmadoPor || null,
                      recebedor: confirmation.recebedor || null,
                      volumesConferidos:
                        confirmation.volumesConferidos === null
                          ? null
                          : Number(confirmation.volumesConferidos),
                      fotoComprovante: null,
                      temFoto: Boolean(confirmation.temFoto),
                      observacao: confirmation.observacao || null,
                    }
                  : null,
              };
            })
          );

          const notasFiltradas = notas.filter((nota) => {
            if (status !== 'TODOS' && nota.status !== status) return false;
            if (!search) return true;
            return [
              nota.numeroNota,
              nota.numeroPedido,
              nota.pedidoId,
              nota.cliente,
              nota.codigo,
            ].some((value) => String(value || '').toLowerCase().includes(search));
          });

          return {
            id: controle.id,
            numeroManifesto: controle.numeroManifesto || controle.id.slice(0, 8),
            dataCriacao: controle.dataCriacao.toISOString(),
            motorista: controle.motorista,
            transportadora: controle.transportadora,
            placaVeiculo: controle.placaVeiculo || '-',
            totalNotas: notas.length,
            entregues: notas.filter((nota) => nota.status === 'ENTREGUE').length,
            pendentes: notas.filter((nota) => nota.status === 'PENDENTE').length,
            notas: notasFiltradas,
          };
        })
      )
    ).filter((controle) => controle.notas.length > 0);

    const todasNotas = entregas.flatMap((controle) => controle.notas);
    const motoristas = isSupervisor
      ? [...new Set(controlesDb.map((controle) => controle.motorista).filter(Boolean))].sort()
      : [user.nome];

    return res.status(200).json({
      entregas,
      totais: {
        total: todasNotas.length,
        pendentes: todasNotas.filter((nota) => nota.status === 'PENDENTE').length,
        entregues: todasNotas.filter((nota) => nota.status === 'ENTREGUE').length,
      },
      motoristaLogado: user.nome,
      podeVerTodos: isSupervisor,
      motoristas,
    });
  } catch (error: any) {
    console.error('[Baixar Entregas] Erro:', error);
    return res.status(500).json({
      message: 'Erro ao buscar entregas',
      details: error?.message || 'Erro interno',
    });
  }
}

export default withAuth(handler);
