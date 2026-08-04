import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

const CONFIRMATION_PREFIX = 'entrega_confirmacao:';
const SUPERVISOR_ROLES = new Set(['ADMIN', 'GERENTE']);
const THIRD_PARTY_CARRIERS = [
  'TERCEIRIZADA',
  'DETAFRA_TRANSPORTES',
  'EXPRESSO_GOIAS',
  'ZANUELO_TRANSPORTE_LOGISTICA',
] as const;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const normalizeNota = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.replace(/^0+/, '') || '0';
};

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
  return value === undefined ? null : (typeof value === 'number' || typeof value === 'string' ? value : String(value));
};

const resolveNotaDetails = async (
  nota: { id: string; numeroNota: string; codigo: string | null },
  username: string,
  password: string
) => {
  const baseDetails = {
    cliente: nota.codigo || 'Cliente não identificado',
    codigoCliente: null as string | number | null,
    pedidoId: null as string | number | null,
    numeroPedido: null as string | null,
    vendedor: null as string | null,
  };

  const accessKey = String(nota.codigo || '').replace(/\D/g, '');
  const external =
    accessKey.length === 44
      ? await apiExternaService.buscarNotaFiscalPorChave(accessKey, username, password)
      : await apiExternaService.buscarNotaFiscalPorNumeroSerie(
          nota.numeroNota,
          '1',
          username,
          password
        );

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
  if (pedidoId !== null) {
    logistica = await apiExternaService.buscarPedidoLogistica(pedidoId, username, password);
  }

  const pedidoLogistica = (logistica?.pedido || {}) as Record<string, any>;
  const notaFiscalLogistica = Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0] || {} : {};
  const merged = { ...data, ...pedidoLogistica, ...notaFiscalLogistica };

  return {
    cliente:
      pickString(
        merged.CLIENTE_NOME,
        merged.NOME_FANTASIA,
        merged.NOME_RAZAO_SOCIAL,
        merged.razaoSocial,
        merged.cliente?.nome
      ) || baseDetails.cliente,
    codigoCliente: pickPedidoId(
      merged.CLIENTE_ID,
      merged.CLIENTE_CODIGO,
      merged.CODIGO_CLIENTE,
      merged.COD_CLIENTE,
      merged.cliente?.codigo,
      merged.cliente?.id
    ),
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
  };
};

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

    const thirdPartyCarrierSet = new Set<string>(THIRD_PARTY_CARRIERS);
    const controlesTerceirizados = controlesDb.filter((controle) =>
      thirdPartyCarrierSet.has(controle.transportadora)
    );
    const controlesFiltrados = isSupervisor
      ? controlesTerceirizados
      : controlesTerceirizados.filter(
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
    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;
    const notaDetailsCache = new Map<string, {
      cliente: string;
      codigoCliente: string | number | null;
      pedidoId: string | number | null;
      numeroPedido: string | null;
      vendedor: string | null;
    }>();

    const entregas = (
      await Promise.all(
        controles.map(async (controle) => {
          const notas = await Promise.all(
            controle.notas.map(async (nota) => {
              const confirmation = confirmationMap.get(
                `${controle.id}:${normalizeNota(nota.numeroNota)}`
              );

              let externalDetails = notaDetailsCache.get(nota.id);
              if (!externalDetails) {
                externalDetails = {
                  cliente: nota.codigo || 'Cliente não identificado',
                  codigoCliente: null,
                  pedidoId: null,
                  numeroPedido: null,
                  vendedor: null,
                };

                if (username && password) {
                  externalDetails = await resolveNotaDetails(nota, username, password);
                }

                notaDetailsCache.set(nota.id, externalDetails);
              }

              const resolvedDetails = externalDetails || {
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
      ? [...new Set(controlesTerceirizados.map((controle) => controle.motorista).filter(Boolean))].sort()
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
