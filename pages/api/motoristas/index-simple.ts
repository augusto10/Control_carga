import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { Transportadora } from '@prisma/client';
import { parseCookies } from 'nookies';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const motoristas = await prisma.motorista.findMany({
        orderBy: { nome: 'asc' },
      });
      return res.status(200).json(motoristas);
    } catch (error: any) {
      console.error('Erro ao listar motoristas:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      // Verificar autenticação
      const cookies = parseCookies({ req });
      const token = cookies.auth_token;
      
      if (!token) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      // Verificar o token JWT
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      if (!decoded || !decoded.id) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const { nome, telefone, cpf, cnh, transportadoraId } = req.body;

      if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
      if (!telefone?.trim()) return res.status(400).json({ error: 'Telefone é obrigatório' });
      if (!cpf?.trim()) return res.status(400).json({ error: 'CPF é obrigatório' });
      if (!cnh?.trim()) return res.status(400).json({ error: 'CNH é obrigatório' });
      if (!transportadoraId?.trim())
        return res.status(400).json({ error: 'Transportadora é obrigatória' });

      // Validar se a transportadora é válida
      const transportadorasValidas = ['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE', 'VLOG'];
      if (!transportadorasValidas.includes(transportadoraId)) {
        return res.status(400).json({ 
          error: `Transportadora inválida: ${transportadoraId}` 
        });
      }

      // Verificar duplicidade por CPF
      const existente = await prisma.motorista.findUnique({ where: { cpf } });
      if (existente) {
        return res.status(400).json({ error: 'Já existe motorista com esse CPF' });
      }

      // Criar motorista
      const novo = await prisma.motorista.create({
        data: { 
          nome, 
          telefone, 
          cpf, 
          cnh, 
          transportadoraId: transportadoraId as Transportadora,
          tipo: 'MOTORISTA'
        },
      });
      
      return res.status(201).json(novo);
    } catch (error: any) {
      console.error('Erro ao criar motorista:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor', 
        message: error.message
      });
    }
  }

  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
