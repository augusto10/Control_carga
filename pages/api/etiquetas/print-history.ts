import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { LabelPrintHistoryInput } from '@/types/labels';

const ALLOWED_TYPES = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'FUNCIONARIO'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user || !user.ativo) {
      return res.status(401).json({ message: 'Não autenticado' });
    }

    if (!ALLOWED_TYPES.includes(user.tipo)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const body = req.body as LabelPrintHistoryInput;
    if (!body?.produtoId || !body?.codigoAdm || !body?.nomeProduto || !body?.codigoBarras || !body?.impressora) {
      return res.status(400).json({ message: 'Dados de histórico inválidos' });
    }

    const entry = await prisma.labelPrintHistory.create({
      data: {
        usuarioId: user.id,
        produtoId: body.produtoId,
        codigoAdm: body.codigoAdm,
        nomeProduto: body.nomeProduto,
        marcaProduto: body.marcaProduto || null,
        codigoBarras: body.codigoBarras,
        quantidade: body.quantidade,
        impressora: body.impressora,
        resultado: body.resultado,
        mensagemErro: body.mensagemErro || null,
      },
    });

    return res.status(201).json(entry);
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : 'Erro ao salvar histórico' });
  }
}
