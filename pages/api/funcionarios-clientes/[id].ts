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
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const pessoa = await prisma.motorista.findUnique({ where: { id } });
      if (!pessoa) return res.status(404).json({ success: false, error: 'Registro não encontrado' });
      return res.status(200).json({ success: true, data: pessoa });
    } catch (error: any) {
      console.error('Erro ao buscar funcionário/cliente:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nome, cpf, telefone, cnh, transportadoraId, tipo, ativo } = req.body || {};
      if (nome !== undefined && (typeof nome !== 'string' || !nome.trim())) {
        return res.status(400).json({ success: false, error: 'Nome inválido' });
      }
      if (cpf !== undefined && (typeof cpf !== 'string' || !cpf.trim())) {
        return res.status(400).json({ success: false, error: 'CPF inválido' });
      }

      const parsedTipo = parseTipo(tipo);
      const resolvedTransportadora = resolveTransportadora(transportadoraId, parsedTipo || undefined);

      const pessoa = await prisma.motorista.update({
        where: { id },
        data: {
          nome: typeof nome === 'string' ? nome.trim() : undefined,
          cpf: typeof cpf === 'string' ? cpf.trim() : undefined,
          telefone: typeof telefone === 'string' ? telefone.trim() : undefined,
          cnh: typeof cnh === 'string' && cnh.trim() ? cnh.trim() : cnh === null ? null : undefined,
          transportadoraId: transportadoraId !== undefined ? resolvedTransportadora : undefined,
          tipo: parsedTipo || undefined,
          ativo: typeof ativo === 'boolean' ? ativo : undefined
        }
      });

      return res.status(200).json({ success: true, data: pessoa });
    } catch (error: any) {
      console.error('Erro ao atualizar funcionário/cliente:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ success: false, code: 'CPF_DUPLICADO', error: 'CPF já cadastrado' });
      }
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.motorista.delete({ where: { id } });
      return res.status(204).end();
    } catch (error: any) {
      console.error('Erro ao excluir funcionário/cliente:', error);
      return res.status(500).json({ success: false, error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ success: false, error: 'Método não permitido' });
}
