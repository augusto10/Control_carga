import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { Transportadora, TipoPessoa } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação
  const token = getTokenFromCookies(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const decoded = await verifyToken(token, JWT_SECRET);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  if (req.method === 'GET') {
    try {
      const { tipo } = req.query;
      
      // Filtrar por tipo se especificado
      const where: any = {};
      if (tipo && ['MOTORISTA', 'FUNCIONARIO', 'CLIENTE'].includes(tipo as string)) {
        where.tipo = tipo as TipoPessoa;
      }

      const pessoas = await prisma.motorista.findMany({
        where,
        orderBy: [
          { tipo: 'asc' },
          { nome: 'asc' }
        ]
      });

      // Mapear dados para incluir informações de tipo
      const pessoasFormatadas = pessoas.map(pessoa => ({
        ...pessoa,
        tipoLabel: pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                   pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente'
      }));

      return res.status(200).json(pessoasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar pessoas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nome, telefone, cpf, cnh, transportadoraId, tipo } = req.body;

      // Validações básicas
      if (!nome || !telefone || !cpf || !transportadoraId || !tipo) {
        return res.status(400).json({ error: 'Campos obrigatórios: nome, telefone, cpf, transportadoraId, tipo' });
      }

      // Validar tipo
      if (!['MOTORISTA', 'FUNCIONARIO', 'CLIENTE'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo deve ser MOTORISTA, FUNCIONARIO ou CLIENTE' });
      }

      // CNH é obrigatória apenas para motoristas
      if (tipo === 'MOTORISTA' && !cnh) {
        return res.status(400).json({ error: 'CNH é obrigatória para motoristas' });
      }

      // Verificar se CPF já existe
      const cpfExistente = await prisma.motorista.findUnique({
        where: { cpf }
      });

      if (cpfExistente) {
        return res.status(400).json({ error: 'CPF já cadastrado' });
      }

      // Criar nova pessoa
      const novaPessoa = await prisma.motorista.create({
        data: {
          nome,
          telefone,
          cpf,
          cnh: tipo === 'MOTORISTA' ? cnh : null,
          transportadoraId: transportadoraId as Transportadora,
          tipo: tipo as TipoPessoa
        }
      });

      return res.status(201).json({
        ...novaPessoa,
        tipoLabel: novaPessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                   novaPessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente'
      });
    } catch (error) {
      console.error('Erro ao criar pessoa:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
