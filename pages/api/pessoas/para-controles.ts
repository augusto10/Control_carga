import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar autenticação
  const token = getTokenFromCookies(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const decoded = await verifyToken(token, JWT_SECRET);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    // Buscar todas as pessoas (motoristas, funcionários e clientes)
    const pessoas = await prisma.motorista.findMany({
      orderBy: [
        { tipo: 'asc' },
        { nome: 'asc' }
      ]
    });

    // Formatar dados para o dropdown de seleção
    const pessoasFormatadas = pessoas.map(pessoa => ({
      id: pessoa.id,
      nome: pessoa.nome,
      cpf: pessoa.cpf,
      telefone: pessoa.telefone,
      cnh: pessoa.cnh,
      transportadoraId: pessoa.transportadoraId,
      tipo: pessoa.tipo,
      tipoLabel: pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                 pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente',
      // Formato para exibição no dropdown: "Nome (Tipo)"
      displayName: `${pessoa.nome} (${pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                                      pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente'})`
    }));

    // Agrupar por tipo para melhor organização
    const agrupados = {
      motoristas: pessoasFormatadas.filter(p => p.tipo === 'MOTORISTA'),
      funcionarios: pessoasFormatadas.filter(p => p.tipo === 'FUNCIONARIO'),
      clientes: pessoasFormatadas.filter(p => p.tipo === 'CLIENTE')
    };

    return res.status(200).json({
      todas: pessoasFormatadas,
      agrupadas: agrupados,
      total: pessoasFormatadas.length
    });
  } catch (error) {
    console.error('Erro ao buscar pessoas para controles:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
