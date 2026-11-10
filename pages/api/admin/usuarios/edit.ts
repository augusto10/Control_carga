import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, nome, tipo, senha, ativo, codigoAdm, senhaAdm, biometria } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID é obrigatório' });
    }

    const data: any = {
      nome,
      tipo,
      ativo,
    };

    if (senha && senha.trim() !== '') {
      data.senha = await bcrypt.hash(senha, 10);
    }

    // Credenciais ADM do separador (opcionais). senhaAdm/biometria vazios
    // significam "manter o valor atual" — o form não os pré-preenche.
    // senhaAdm fica em texto puro — repassada em claro ao job de automação.
    if (codigoAdm !== undefined) {
      const codigoAdmNum = Number(codigoAdm);
      data.codigoAdm = Number.isInteger(codigoAdmNum) ? codigoAdmNum : null;
    }
    if (typeof senhaAdm === 'string' && senhaAdm.trim()) {
      data.senhaAdm = senhaAdm.trim();
    }
    if (typeof biometria === 'string' && biometria.trim()) {
      data.biometria = biometria.trim();
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
      },
    });

    return res.status(200).json(usuario);
  } catch (error) {
    console.error('Erro ao editar usuário:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
