import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    // Autenticação
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = await verifyToken(token, process.env.JWT_SECRET || 'secret');
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar permissão (apenas ADMIN/GERENTE)
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id }
    });

    if (!usuario || !['ADMIN', 'GERENTE'].includes(usuario.tipo)) {
      return res.status(403).json({ error: 'Sem permissão para aprovar solicitações' });
    }

    // Buscar solicitação
    const solicitacao = await prisma.solicitacaoMaterial.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            material: true
          }
        }
      }
    });

    if (!solicitacao) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    if (solicitacao.status !== 'PENDENTE') {
      return res.status(400).json({ error: 'Solicitação já foi processada' });
    }

    const { itensAprovados } = req.body;

    // Validar itens aprovados
    if (!itensAprovados || !Array.isArray(itensAprovados)) {
      return res.status(400).json({ error: 'Itens aprovados são obrigatórios' });
    }

    // Atualizações em transação: atualizar itens, deduzir estoque e registrar histórico
    const solicitacaoAtualizada = await prisma.$transaction(async (tx) => {
      for (const itemAprovado of itensAprovados) {
        const item = solicitacao.itens.find(i => i.id === itemAprovado.itemId);
        
        if (!item) {
          throw new Error(`Item ${itemAprovado.itemId} não encontrado`);
        }

        const quantidadeAprovada = itemAprovado.quantidadeAprovada || item.quantidade;

        // Obter estoque atual dentro da transação
        const materialAtual = await tx.materialEstoque.findUnique({
          where: { id: item.materialId },
          select: { id: true, nome: true, quantidadeEstoque: true }
        });

        if (!materialAtual) {
          throw new Error(`Material ${item.materialId} não encontrado`);
        }

        if (materialAtual.quantidadeEstoque < quantidadeAprovada) {
          throw new Error(`Estoque insuficiente para ${materialAtual.nome}. Disponível: ${materialAtual.quantidadeEstoque}, Solicitado: ${quantidadeAprovada}`);
        }

        const quantidadeAntes = materialAtual.quantidadeEstoque;
        const quantidadeDepois = quantidadeAntes - quantidadeAprovada;

        // Atualizar item com quantidade aprovada
        await tx.itemSolicitacaoMaterial.update({
          where: { id: item.id },
          data: { quantidadeAprovada }
        });

        // Deduzir do estoque
        await tx.materialEstoque.update({
          where: { id: item.materialId },
          data: {
            quantidadeEstoque: {
              decrement: quantidadeAprovada
            }
          }
        });

        // Registrar histórico (SAIDA) - apenas se a tabela existir
        try {
          await tx.historicoEstoque.create({
            data: {
              materialId: item.materialId,
              tipo: 'SAIDA',
              quantidade: quantidadeAprovada,
              quantidadeAntes,
              quantidadeDepois,
              usuarioId: decoded.id,
              observacao: `Saída por aprovação da solicitação ${id}`,
              solicitacaoId: id
            }
          });
        } catch (historicoError) {
          // Se a tabela HistoricoEstoque não existir, apenas logar e continuar
          console.warn('Tabela HistoricoEstoque não encontrada, pulando registro de histórico:', (historicoError as Error).message);
        }
      }

      // Atualizar solicitação como aprovada
      const atualizada = await tx.solicitacaoMaterial.update({
        where: { id },
        data: {
          status: 'APROVADA',
          aprovadorId: decoded.id,
          dataAprovacao: new Date()
        },
        include: {
          solicitante: { select: { id: true, nome: true, email: true } },
          aprovador: { select: { id: true, nome: true, email: true } },
          itens: { include: { material: true } }
        }
      });

      return atualizada;
    });

    return res.status(200).json(solicitacaoAtualizada);

  } catch (error: any) {
    console.error('Erro ao aprovar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
