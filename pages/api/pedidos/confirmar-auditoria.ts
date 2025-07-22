import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} não permitido` });
  }

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

  // Verificar se o usuário tem permissão para auditar (AUDITOR ou ADMIN)
  if (currentUser.tipo !== 'AUDITOR' && currentUser.tipo !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso negado. Permissão de auditor necessária.' });
  }

  const { 
    pedidoId, 
    pedido100, 
    inconsistencia, 
    motivoInconsistencia, 
    observacoes 
  } = req.body;

  // Validação dos dados
  if (!pedidoId || typeof pedido100 !== 'boolean' || typeof inconsistencia !== 'boolean') {
    return res.status(400).json({ message: 'Dados inválidos. Verifique os campos obrigatórios.' });
  }

  if (inconsistencia && !motivoInconsistencia) {
    return res.status(400).json({ message: 'Motivo da inconsistência é obrigatório quando há inconsistência.' });
  }

  try {
    // Verificar se o pedido existe e ainda não foi auditado
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        conferido: true
      }
    });

    if (!pedido) {
      return res.status(404).json({ message: 'Pedido não encontrado' });
    }

    if (!pedido.conferido) {
      return res.status(400).json({ message: 'Este pedido ainda não foi separado/conferido' });
    }

    if (pedido.conferido.auditoriaRealizada) {
      return res.status(400).json({ message: 'Este pedido já foi auditado' });
    }

    if (!pedido.conferido.separadorId) {
      return res.status(400).json({ message: 'Este pedido ainda não foi separado' });
    }

    // Atualizar o PedidoConferido com os dados da auditoria
    const pedidoConferidoAtualizado = await prisma.pedidoConferido.update({
      where: { id: pedido.conferido.id },
      data: {
        auditorId: currentUser.id,
        auditoriaRealizada: true,
        auditoriaComErro: inconsistencia,
        dataAuditoria: new Date(),
        observacaoAuditoria: observacoes || null,
        // Atualizar também os campos específicos da auditoria
        pedido100: pedido100,
        inconsistencia: inconsistencia,
        motivosInconsistencia: inconsistencia ? [motivoInconsistencia] : []
      },
      include: {
        auditor: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      }
    });

    return res.status(200).json({
      message: 'Auditoria confirmada com sucesso',
      auditoria: {
        id: pedidoConferidoAtualizado.id,
        pedido100: pedidoConferidoAtualizado.pedido100,
        inconsistencia: pedidoConferidoAtualizado.inconsistencia,
        motivosInconsistencia: pedidoConferidoAtualizado.motivosInconsistencia,
        observacoes: pedidoConferidoAtualizado.observacaoAuditoria,
        dataAuditoria: pedidoConferidoAtualizado.dataAuditoria,
        auditor: pedidoConferidoAtualizado.auditor
      }
    });
  } catch (error: any) {
    console.error('Erro ao confirmar auditoria:', error);
    
    // Verificar se é erro de constraint/foreign key
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Este pedido já foi auditado por outro usuário' });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({ message: 'Referência inválida nos dados fornecidos' });
    }

    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
