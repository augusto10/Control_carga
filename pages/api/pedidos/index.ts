import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../lib/prisma';

// ===== API PARA PEDIDOS - SEPARAÇÃO E CONFERÊNCIA =====
// Esta API é específica para o domínio de PEDIDOS (separação/conferência)
// NÃO confundir com Notas Fiscais - são entidades totalmente distintas
// Todos os dados de separação/conferência são salvos em PedidoConferido

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação via cookie JWT
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  let decoded: any;
  try {
    decoded = verify(token, JWT_SECRET) as { id: string; tipo: string; email: string };
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }

  // Buscar o usuário atual pelo ID do token
  const currentUser = await prisma.usuario.findUnique({
    where: { id: decoded.id },
    select: { id: true, tipo: true, ativo: true }
  });

  if (!currentUser || !currentUser.ativo) {
    return res.status(403).json({ message: 'Acesso negado. Usuário inativo.' });
  }

  if (req.method === 'GET') {
    try {
      const { dataInicio, dataFim, status } = req.query;
      const where: any = {};

      if (dataInicio && typeof dataInicio === 'string') {
        where.dataCriacao = { ...where.dataCriacao, gte: new Date(dataInicio) };
      }

      if (dataFim && typeof dataFim === 'string') {
        where.dataCriacao = { ...where.dataCriacao, lte: new Date(dataFim) };
      }

      if (status === 'com-inconsistencia') {
        where.conferido = {
          inconsistencia: true,
        };
      } else if (status === 'sem-inconsistencia') {
        where.conferido = {
          inconsistencia: false,
        };
      }

      const pedidos = await prisma.pedido.findMany({
        where,
        include: {
          controle: true,
          conferido: {
            include: {
              separador: true,
              conferente: true,
              auditor: true,
            },
          },
        },
        orderBy: {
          dataCriacao: 'desc',
        },
      });

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).json(pedidos);
    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
  } else if (req.method === 'POST') {
    // ===== CADASTRAR SEPARAÇÃO - SALVAR EM PEDIDOCONFERIDO =====
    // Esta funcionalidade salva dados de separação em PedidoConferido
    // NÃO tem relação com Notas Fiscais
    
    try {
      const { numeroPedido, separadorId, auditorId, conferenteId } = req.body;

      if (!numeroPedido || !separadorId) {
        return res.status(400).json({ error: 'Número do Pedido e Separador são obrigatórios.' });
      }

      // Verificar se o pedido já existe
      const pedidoExistente = await prisma.pedido.findFirst({
        where: { numeroPedido }
      });

      if (pedidoExistente) {
        return res.status(400).json({ error: 'Já existe um pedido com este número.' });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        // Criar o pedido (sem controle de carga - pedidos são independentes de notas fiscais)
        const novoPedido = await tx.pedido.create({
          data: {
            numeroPedido,
            // controleId: null - pedidos de separação não precisam de controle de carga
          },
        });

        // ===== SALVAR DADOS DE SEPARAÇÃO EM PEDIDOCONFERIDO =====
        // Todos os dados de separação/conferência ficam centralizados aqui
        const pedidoConferido = await tx.pedidoConferido.create({
          data: {
            pedidoId: novoPedido.id,
            separadorId: separadorId,
            auditorId: auditorId || null, // Auditor pode ser definido depois
            conferenteId: conferenteId || null, // Conferente pode ser definido depois
            // Campos de controle de fluxo
            conferenciaRealizada: false,
            auditoriaRealizada: false,
            dataCriacao: new Date()
          },
          include: {
            separador: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            },
            auditor: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            },
            conferente: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        });

        return {
          pedido: novoPedido,
          dadosSeparacao: pedidoConferido
        };
      });

      res.status(201).json({
        message: 'Separação cadastrada com sucesso',
        data: resultado
      });
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      res.status(500).json({ error: 'Erro ao salvar pedido' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
