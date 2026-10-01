import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { TipoPessoa } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const motoristas = await prisma.motorista.findMany({
      where: {
        ativo: true
      },
      orderBy: {
        nome: 'asc'
      }
    });

    const mappedPessoas = motoristas.map(m => {
      let tipoLabel = 'Motorista';
      if (m.tipo === TipoPessoa.FUNCIONARIO) tipoLabel = 'Funcionário';
      if (m.tipo === TipoPessoa.CLIENTE) tipoLabel = 'Cliente';

      return {
        id: m.id,
        nome: m.nome,
        cpf: m.cpf,
        telefone: m.telefone,
        cnh: m.cnh,
        transportadoraId: m.transportadoraId,
        tipo: m.tipo,
        tipoLabel: tipoLabel,
        displayName: `${m.nome} (${tipoLabel})`,
        transportadora: {
          id: m.transportadoraId,
          descricao: m.transportadoraId.replace(/_/g, ' ')
        }
      };
    });

    return res.status(200).json({
      todas: mappedPessoas,
      motoristas: mappedPessoas.filter(p => p.tipo === TipoPessoa.MOTORISTA),
      funcionarios: mappedPessoas.filter(p => p.tipo === TipoPessoa.FUNCIONARIO),
      clientes: mappedPessoas.filter(p => p.tipo === TipoPessoa.CLIENTE)
    });
  } catch (error) {
    console.error('Erro ao buscar pessoas para controles:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
