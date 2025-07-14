import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, TipoUsuario } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

// Tipos para os parâmetros de consulta
type QueryParams = {
  dataInicio?: string;
  dataFim?: string;
  inconsistente?: string;
  page?: string;
  limit?: string;
};

// Tipos para o corpo da requisição de atualização
type UpdateBody = {
  pedido100: boolean;
  inconsistencia: boolean;
  motivosInconsistencia?: string[];
  observacoes?: string;
};

const secret = process.env.NEXTAUTH_SECRET;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const token = await getToken({ req, secret });
    
    if (!token) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    if (req.method === 'GET') {
      return listarConferencias(req, res);
    } else if (req.method === 'PUT') {
      return atualizarConferencia(req, res);
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Erro no manipulador de conferências:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

async function listarConferencias(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Obter parâmetros de consulta
    const { dataInicio, dataFim, inconsistente, page = '1', limit = '10' } = req.query as QueryParams;

    // Construir filtros
    const where: any = {};
    
    // Filtrar por data
    if (dataInicio || dataFim) {
      where.dataCriacao = {};
      if (dataInicio) where.dataCriacao.gte = new Date(dataInicio);
      if (dataFim) {
        const endOfDay = new Date(dataFim);
        endOfDay.setHours(23, 59, 59, 999);
        where.dataCriacao.lte = endOfDay;
      }
    }
    
    // Filtrar por inconsistência
    if (inconsistente === 'true') {
      where.inconsistencia = true;
    } else if (inconsistente === 'false') {
      where.inconsistencia = false;
    }

    // Paginação
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * pageSize;

    // Buscar as conferências
    const [pedidosConferidos, total] = await Promise.all([
      (prisma as any).pedidoConferido.findMany({
        where,
        include: {
          pedido: {
            include: {
              controle: {
                select: {
                  id: true,
                  numeroManifesto: true,
                  motorista: true,
                  responsavel: true,
                  transportadora: true,
                  dataConferencia: true,
                },
              },
            },
          },
          conferente: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        orderBy: {
          dataCriacao: 'desc',
        },
        skip,
        take: pageSize,
      }),
      (prisma as any).pedidoConferido.count({ where }),
    ]);

    // Retornar os resultados
    return res.status(200).json({
      data: pedidosConferidos,
      pagination: {
        total,
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Erro ao listar conferências:', error);
    return res.status(500).json({ 
      error: 'Erro ao listar as conferências',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

async function atualizarConferencia(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verificar se o usuário está autenticado
    const token = await getToken({ req });
    if (!token?.sub) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    // Verificar permissões (apenas ADMIN, GERENTE ou AUDITOR podem editar)
    const user = await prisma.usuario.findUnique({
      where: { id: token.sub },
      select: { tipo: true },
    });

    if (!user || !([TipoUsuario.ADMIN, TipoUsuario.GERENTE, TipoUsuario.AUDITOR] as string[]).includes(user.tipo)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { id } = req.query;
    const {
      pedido100,
      inconsistencia,
      motivosInconsistencia = [],
      observacoes,
    } = req.body;

    // Validar dados
    if (typeof pedido100 !== 'boolean' || typeof inconsistencia !== 'boolean') {
      return res.status(400).json({ error: 'Dados inválidos' });
    }

    // Verificar se a conferência existe
    const conferenciaExistente = await (prisma as any).pedidoConferido.findUnique({
      where: { id: id as string },
      include: { pedido: true },
    });

    if (!conferenciaExistente) {
      return res.status(404).json({ error: 'Conferência não encontrada' });
    }

    // Atualizar a conferência
    const conferenciaAtualizada = await (prisma as any).pedidoConferido.update({
      where: { id: id as string },
      data: {
        pedido100,
        inconsistencia,
        motivosInconsistencia: Array.isArray(motivosInconsistencia) ? motivosInconsistencia : [],
        observacoes,
      },
      include: {
        pedido: {
          include: {
            controle: {
              select: {
                id: true,
                numeroManifesto: true,
                motorista: true,
                responsavel: true,
                transportadora: true,
                dataConferencia: true,
              },
            },
          },
        },
        conferente: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    // Atualizar também o controle de carga associado
    await prisma.controleCarga.update({
      where: { id: conferenciaAtualizada.pedido.controleId },
      data: {
        pedido100: Boolean(pedido100),
        inconsistencia: Boolean(inconsistencia),
        motivosInconsistencia: Array.isArray(motivosInconsistencia) 
          ? motivosInconsistencia 
          : [],
        observacao: observacoes || null,
      },
    });

    // Retornar os dados no formato esperado pelo frontend
    return res.status(200).json({
      id: conferenciaAtualizada.id,
      dataCriacao: conferenciaAtualizada.dataCriacao,
      pedido100: conferenciaAtualizada.pedido100,
      inconsistencia: conferenciaAtualizada.inconsistencia,
      motivosInconsistencia: conferenciaAtualizada.motivosInconsistencia,
      observacoes: conferenciaAtualizada.observacoes,
      conferente: {
        id: conferenciaAtualizada.conferente.id,
        nome: conferenciaAtualizada.conferente.nome,
        email: conferenciaAtualizada.conferente.email,
      },
      pedido: {
        id: conferenciaAtualizada.pedido.id,
        numeroPedido: conferenciaAtualizada.pedido.numeroPedido,
        controle: {
          id: conferenciaAtualizada.pedido.controle.id,
          numeroManifesto: conferenciaAtualizada.pedido.controle.numeroManifesto,
          motorista: conferenciaAtualizada.pedido.controle.motorista,
          responsavel: conferenciaAtualizada.pedido.controle.responsavel,
          transportadora: conferenciaAtualizada.pedido.controle.transportadora,
          dataConferencia: conferenciaAtualizada.pedido.controle.dataConferencia,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao atualizar conferência:', error);
    return res.status(500).json({ 
      error: 'Erro ao atualizar a conferência',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
