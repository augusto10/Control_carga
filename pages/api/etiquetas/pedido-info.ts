import { NextApiRequest, NextApiResponse } from 'next';
import { TipoUsuario } from '@prisma/client';
import { apiExternaService } from '@/services/api-externa';
import { getAuthenticatedUser } from '@/lib/server-auth';
import prisma from '@/lib/prisma';
import {
  mapearDadosPedidoParaEtiqueta,
  sanitizeNumeroPedido,
} from '@/lib/etiquetas-transporte';

const ALLOWED_ROLES: TipoUsuario[] = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'FUNCIONARIO'];

async function buscarDadosDoSnapshot(numeroPedido: string) {
  const pedidoId = Number(numeroPedido.replace(/\D/g, ''));
  if (!Number.isInteger(pedidoId) || pedidoId <= 0) return null;

  const snapshot = await (prisma as any).pedidoLogisticaSnapshot.findUnique({
    where: { pedidoId },
  });
  if (!snapshot) return null;

  const rawPedido = (snapshot.rawPedido || {}) as Record<string, any>;
  const rawLogistica = (snapshot.rawLogistica || {}) as Record<string, any>;
  const rawLogisticaPedido = (rawLogistica.pedido || {}) as Record<string, any>;
  const notaFiscal = Array.isArray(rawLogistica.notas_fiscais)
    ? (rawLogistica.notas_fiscais[0] || {}) as Record<string, any>
    : {};
  const cliente = (rawLogisticaPedido.cliente || rawPedido.cliente || {}) as Record<string, any>;
  const primeiroCampo = (...values: unknown[]) => {
    const value = values.find((item) => item !== null && item !== undefined && String(item).trim());
    return String(value ?? '').trim();
  };

  const cnpj = primeiroCampo(
    rawPedido.cnpj,
    rawPedido.CNPJ,
    rawPedido.cnpj_cpf,
    rawPedido.CNPJ_CPF,
    rawLogisticaPedido.cnpj,
    rawLogisticaPedido.CNPJ,
    notaFiscal.cnpj,
    notaFiscal.CNPJ,
    cliente.cnpj,
    cliente.CNPJ,
  );
  const numeroNota = primeiroCampo(
    snapshot.numeroNota,
    rawPedido.numero_nota,
    rawPedido.NUMERO_NOTA,
    rawLogisticaPedido.numero_nota,
    rawLogisticaPedido.NUMERO_NOTA,
    notaFiscal.numero,
    notaFiscal.numeroNota,
    notaFiscal.NUMERO,
    notaFiscal.NUMERO_NOTA,
  );

  return {
    pedidoId: String(snapshot.pedidoId),
    numeroPedido: String(snapshot.pedidoId),
    cliente: String(snapshot.clienteNome || snapshot.nomeFantasia || rawPedido.cliente_nome || ''),
    cnpj,
    transportadora: snapshot.transportadoraNome || rawPedido.transportadora || null,
    volumes: Number(rawPedido.itens_gerar || rawPedido.volumes || notaFiscal.volumes || 1) || 1,
    numeroNota,
    fonte: 'snapshot_local',
  };
}

/**
 * Resolve os dados de um pedido para autopreencher o formulario de etiquetas.
 *
 * Fluxo:
 *  1. /api/v1/pedidos/{numero}       (resolve o pedido pelo numero = ORCAMENTO_ID)
 *  2. /api/v1/pedidos/{pedido_id}/logistica  (dados de logistica)
 *  3. /api/v1/clientes/{cadastro_id} (CNPJ/CPF e razao social confiaveis)
 *
 * O retorno normaliza cliente, CNPJ, transportadora, volumes e numero da nota
 * para o formato usado no formulario de etiquetas de transporte.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req);

  if (!user || !user.ativo) {
    return res.status(401).json({ message: 'Nao autorizado.' });
  }

  if (!ALLOWED_ROLES.includes(user.tipo)) {
    return res.status(403).json({ message: 'Voce nao tem permissao para acessar etiquetas de transporte.' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Metodo nao permitido.' });
  }

  const numeroPedido = sanitizeNumeroPedido(String(req.query.numero_pedido || '').trim());
  if (!numeroPedido) {
    return res.status(400).json({ message: 'Informe o numero do pedido.' });
  }

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;

  try {
    const numeroDigitos = numeroPedido.replace(/\D/g, '');

    if (!username || !password) {
      const snapshot = await buscarDadosDoSnapshot(numeroPedido);
      return snapshot
        ? res.status(200).json(snapshot)
        : res.status(503).json({ message: 'Credenciais da API externa nao configuradas.' });
    }

    // 1) Resolve o pedido pelo id (ORCAMENTO_ID == numero do pedido).
    //    O endpoint /api/v1/pedidos?numero_pedido=... nao aplica o filtro
    //    (retorna sempre os ultimos pedidos), por isso a resolucao direta
    //    por id e preferida.
    let pedido = numeroDigitos
      ? await apiExternaService.buscarPedidoPorId(numeroDigitos, username, password)
      : null;

    // 2) Fallback: lista os pedidos mais recentes e casa pelo numero exato.
    if (!pedido) {
      const lista = await apiExternaService.listarPedidos({ limit: 100 }, username, password);
      pedido =
        lista?.data?.find((item) => {
          const id = String(item.ORCAMENTO_ID ?? item.PEDIDO_ID ?? item.ID ?? '').replace(/\D/g, '');
          return id === numeroDigitos;
        }) || null;
    }

    if (!pedido) {
      const snapshot = await buscarDadosDoSnapshot(numeroPedido);
      return snapshot
        ? res.status(200).json(snapshot)
        : res.status(404).json({ message: 'Pedido nao encontrado na API externa.' });
    }

    const pedidoId = String(
      pedido?.ORCAMENTO_ID ?? pedido?.PEDIDO_ID ?? pedido?.ORCAMENTO_BASE_ID ?? pedido?.ID ?? ''
    );

    const logistica = pedidoId
      ? await apiExternaService.buscarPedidoLogistica(pedidoId, username, password)
      : null;

    if (!logistica) {
      const snapshot = await buscarDadosDoSnapshot(numeroPedido);
      return snapshot
        ? res.status(200).json(snapshot)
        : res.status(404).json({ message: 'Logistica do pedido nao encontrada.' });
    }

    // 3) Enriquecimento com o cadastro do cliente (CNPJ/CPF e razao social).
    const cadastroId = String(
      pedido?.CADASTRO_ID ?? (logistica.pedido as Record<string, any> | undefined)?.CADASTRO_ID ?? ''
    );
    const clienteExterno = cadastroId
      ? await apiExternaService.buscarCliente(cadastroId, username, password)
      : null;

    const dados = mapearDadosPedidoParaEtiqueta(
      logistica as Record<string, any>,
      clienteExterno as Record<string, any> | null
    );

    return res.status(200).json({
      pedidoId: dados.pedidoId || pedidoId,
      numeroPedido: String(pedido?.ORCAMENTO_ID ?? pedido?.NUMERO_PEDIDO ?? numeroPedido),
      cliente: dados.cliente,
      cnpj: dados.cnpj,
      transportadora: dados.transportadora,
      volumes: dados.volumes,
      numeroNota: dados.numeroNota,
    });
  } catch (error: any) {
    console.error('[etiquetas/pedido-info] Erro ao buscar dados do pedido:', error?.message || error);
    return res.status(500).json({ message: 'Erro ao buscar os dados do pedido na API externa.' });
  }
}
