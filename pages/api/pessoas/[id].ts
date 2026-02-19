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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const pessoa = await prisma.motorista.findUnique({
        where: { id }
      });

      if (!pessoa) {
        return res.status(404).json({ error: 'Pessoa não encontrada' });
      }

      return res.status(200).json({
        ...pessoa,
        tipoLabel: pessoa.tipo === 'MOTORISTA' ? 'Motorista' : 
                   pessoa.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente'
      });
    } catch (error) {
      console.error('Erro ao buscar pessoa:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nome, telefone, cpf, cnh, transportadoraId, tipo } = req.body;

      // Validações básicas
      if (!nome || !telefone || !transportadoraId || !tipo) {
        return res.status(400).json({ error: 'Campos obrigatórios: nome, telefone, transportadoraId, tipo' });
      }

      // Validar tipo
      if (!['MOTORISTA', 'FUNCIONARIO', 'CLIENTE'].includes(tipo)) {
        return res.status(400).json({ error: 'Tipo deve ser MOTORISTA, FUNCIONARIO ou CLIENTE' });
      }

      // CNH é obrigatória apenas para motoristas
      if (tipo === 'MOTORISTA' && !cnh) {
        return res.status(400).json({ error: 'CNH é obrigatória para motoristas' });
      }

      // Verificar se a pessoa existe
      const pessoaExistente = await prisma.motorista.findUnique({
        where: { id }
      });

      if (!pessoaExistente) {
        return res.status(404).json({ error: 'Pessoa não encontrada' });
      }

      // Se o CPF foi alterado, verificar se já existe
      if (cpf && cpf !== pessoaExistente.cpf) {
        const cpfExistente = await prisma.motorista.findUnique({
          where: { cpf }
        });

        if (cpfExistente) {
          return res.status(400).json({ error: 'CPF já cadastrado' });
        }
      }

      // Atualizar pessoa
      const pessoaAtualizada = await prisma.motorista.update({
        where: { id },
        data: {
          nome,
          telefone,
          ...(cpf && { cpf }),
          cnh: tipo === 'MOTORISTA' ? cnh : null,
          transportadoraId: transportadoraId as Transportadora,
          tipo: tipo as TipoPessoa
        }
      });

      return res.status(200).json({
        ...pessoaAtualizada,
        tipoLabel: pessoaAtualizada.tipo === 'MOTORISTA' ? 'Motorista' : 
                   pessoaAtualizada.tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente'
      });
    } catch (error) {
      console.error('Erro ao atualizar pessoa:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Verificar se a pessoa existe
      const pessoaExistente = await prisma.motorista.findUnique({
        where: { id }
      });

      if (!pessoaExistente) {
        return res.status(404).json({ error: 'Pessoa não encontrada' });
      }

      // Verificar se a pessoa está sendo usada em algum controle
      const controlesComPessoa = await prisma.controleCarga.findFirst({
        where: {
          OR: [
            { motorista: pessoaExistente.nome },
            { cpfMotorista: pessoaExistente.cpf }
          ]
        }
      });

      if (controlesComPessoa) {
        return res.status(400).json({ 
          error: 'Não é possível excluir esta pessoa pois ela está vinculada a controles de carga' 
        });
      }

      // Excluir pessoa
      await prisma.motorista.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Pessoa excluída com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir pessoa:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
