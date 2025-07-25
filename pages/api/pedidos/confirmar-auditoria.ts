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

    // Criar ou atualizar o registro de conferência
    const pedidoConferido = await prisma.pedidoConferido.upsert({
      where: { pedidoId },
      update: {
        auditorId: currentUser.id,
        auditoriaRealizada: true,
        auditoriaComErro: inconsistencia,
        dataAuditoria: new Date(),
        observacaoAuditoria: observacoes,
        motivosInconsistencia: inconsistencia ? [motivoInconsistencia] : []
      },
      create: {
        pedidoId,
        auditorId: currentUser.id,
        auditoriaRealizada: true,
        auditoriaComErro: inconsistencia,
        dataAuditoria: new Date(),
        observacaoAuditoria: observacoes,
        motivosInconsistencia: inconsistencia ? [motivoInconsistencia] : []
      }
    });

    // Integração automática com gamificação
    try {
      // Identificar o usuário responsável (separador ou conferente)
      const pedidoCompleto = await prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: {
          controle: {
            select: { motorista: true, responsavel: true }
          }
        }
      });

      if (pedidoCompleto?.controle) {
        const responsavel = pedidoCompleto.controle.motorista || pedidoCompleto.controle.responsavel;
        
        if (responsavel && responsavel !== 'PENDENTE') {
          const usuario = await prisma.usuario.findFirst({
            where: { nome: responsavel }
          });

          if (usuario) {
            // Registrar pontuação baseada no resultado da auditoria
            const acao = inconsistencia ? 'PEDIDO_INCORRETO' : 'PEDIDO_CORRETO';
            const pontos = inconsistencia ? -5 : 10;
            
            await prisma.historicoPontuacao.create({
              data: {
                usuarioId: usuario.id,
                pedidoId,
                acao,
                pontosGanhos: pontos,
                descricao: `Auditoria ${inconsistencia ? 'com erro' : 'correta'} do pedido ${pedidoId}`
              }
            });

            // Atualizar pontuação total
            const pontuacaoAtual = await prisma.pontuacaoUsuario.findUnique({
              where: { usuarioId: usuario.id }
            });

            if (pontuacaoAtual) {
              await prisma.pontuacaoUsuario.update({
                where: { usuarioId: usuario.id },
                data: {
                  pontuacaoTotal: { increment: pontos },
                  pedidosCorretos: !inconsistencia ? { increment: 1 } : { increment: 0 },
                  pedidosIncorretos: inconsistencia ? { increment: 1 } : { increment: 0 }
                }
              });
            } else {
              await prisma.pontuacaoUsuario.create({
                data: {
                  usuarioId: usuario.id,
                  pontuacaoTotal: pontos,
                  pedidosCorretos: !inconsistencia ? 1 : 0,
                  pedidosIncorretos: inconsistencia ? 1 : 0
                }
              });
            }
          }
        }
      }
    } catch (gamificacaoError) {
      console.error('Erro ao registrar pontuação na gamificação:', gamificacaoError);
      // Não falhar a requisição principal por erro na gamificação
    }

    return res.status(200).json({
      message: 'Auditoria confirmada com sucesso',
      auditoria: {
        id: pedidoConferido.id,
        pedido100: !inconsistencia,
        inconsistencia,
        motivosInconsistencia: pedidoConferido.motivosInconsistencia,
        observacoes: pedidoConferido.observacaoAuditoria,
        dataAuditoria: pedidoConferido.dataAuditoria
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
