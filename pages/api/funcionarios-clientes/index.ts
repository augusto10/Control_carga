import { NextApiRequest, NextApiResponse } from 'next';
import { Transportadora, TipoPessoa } from '@prisma/client';
import prisma from '@/lib/prisma';

const transportadoras = Object.values(Transportadora);

const parseTipo = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const upper = value.toUpperCase();
  if (upper === 'RESPONSAVEL') return TipoPessoa.FUNCIONARIO;
  if (Object.values(TipoPessoa).includes(upper as TipoPessoa)) {
    return upper as TipoPessoa;
  }
  return null;
};

const resolveTransportadora = (value: unknown, tipo?: TipoPessoa | null) => {
  if (typeof value === 'string' && transportadoras.includes(value as Transportadora)) {
    return value as Transportadora;
  }
  if (tipo === TipoPessoa.CLIENTE && transportadoras.includes('RETIRA_CLIENTE' as Transportadora)) {
    return 'RETIRA_CLIENTE' as Transportadora;
  }
  if (transportadoras.includes('RETIRA_VENDEDOR' as Transportadora)) {
    return 'RETIRA_VENDEDOR' as Transportadora;
  }
  return (transportadoras[0] || 'ACCERT') as Transportadora;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { tipo, ativo, search } = req.query;

      const where: any = {};
      const parsedTipo = parseTipo(tipo);
      if (parsedTipo) where.tipo = parsedTipo;

      if (typeof ativo === 'string') {
        if (ativo.toLowerCase() === 'true') where.ativo = true;
        if (ativo.toLowerCase() === 'false') where.ativo = false;
      }

      if (typeof search === 'string' && search.trim()) {
        const termo = search.trim();
        where.OR = [
          { nome: { contains: termo, mode: 'insensitive' } },
          { cpf: { contains: termo, mode: 'insensitive' } },
          { telefone: { contains: termo, mode: 'insensitive' } },
          { cnh: { contains: termo, mode: 'insensitive' } }
        ];
      }

      const pessoas = await prisma.motorista.findMany({
        where,
        orderBy: { nome: 'asc' }
      });

      return res.status(200).json({ success: true, data: pessoas });
    } catch (error: any) {
      console.error('Erro ao buscar funcionários/clientes:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nome, cpf, telefone, cnh, transportadoraId, tipo, ativo } = req.body || {};
      if (!nome || typeof nome !== 'string' || !nome.trim()) {
        return res.status(400).json({ success: false, error: 'Nome é obrigatório' });
      }
      if (!cpf || typeof cpf !== 'string' || !cpf.trim()) {
        return res.status(400).json({ success: false, error: 'CPF é obrigatório' });
      }

      const parsedTipo = parseTipo(tipo) || TipoPessoa.FUNCIONARIO;
      const resolvedTransportadora = resolveTransportadora(transportadoraId, parsedTipo);

      const pessoa = await prisma.motorista.create({
        data: {
          nome: nome.trim(),
          cpf: cpf.trim(),
          telefone: typeof telefone === 'string' ? telefone.trim() : '',
          cnh: typeof cnh === 'string' && cnh.trim() ? cnh.trim() : null,
          transportadoraId: resolvedTransportadora,
          tipo: parsedTipo,
          ativo: typeof ativo === 'boolean' ? ativo : true
        }
      });

      return res.status(201).json({ success: true, data: pessoa });
    } catch (error: any) {
      console.error('Erro ao criar funcionário/cliente:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, code: 'CPF_DUPLICADO', error: 'CPF já cadastrado' });
      }
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ success: false, error: 'Método não permitido' });
}
