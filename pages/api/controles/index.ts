import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Transportadora = 'ACERT' | 'EXPRESSO_GOIAS';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': {
      try {
        const controles = await prisma.controleCarga.findMany({
          orderBy: { dataCriacao: 'desc' },
          include: {
            notas: true,
          },
        });
        res.status(200).json(controles);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar controles' });
      }
      break;
    }
    case 'POST': {
      try {
        const { motorista, responsavel, cpfMotorista, transportadora, qtdPallets, observacao, numeroManifesto, notasIds } = req.body;

        // Validar campos obrigatórios
        const camposObrigatorios = [];
        if (!motorista?.trim()) camposObrigatorios.push('motorista');
        if (!responsavel?.trim()) camposObrigatorios.push('responsavel');
        if (!cpfMotorista?.trim()) camposObrigatorios.push('cpfMotorista');

        if (camposObrigatorios.length > 0) {
          return res.status(400).json({ 
            error: 'Campos obrigatórios não fornecidos',
            requiredFields: camposObrigatorios
          });
        }

        // Validar se as notas existem e estão disponíveis
        if (notasIds && notasIds.length > 0) {
          const notasExistentes = await prisma.notaFiscal.findMany({
            where: {
              id: { in: notasIds },
              OR: [
                { controleId: { not: null } },
              ]
            },
            select: { id: true }
          });

          if (notasExistentes.length > 0) {
            return res.status(400).json({
              error: 'Uma ou mais notas já estão vinculadas a outro controle',
              notasIndisponiveis: notasExistentes.map(n => n.id)
            });
          }
        }

        // Se não veio um número de manifesto, gera um sequencial
        let numeroManifestoFinal = numeroManifesto;
        if (!numeroManifestoFinal) {
          // Encontra o maior número de manifesto existente
          // Busca o maior número de manifesto existente
          const todosControles = await prisma.controleCarga.findMany({
            select: { 
              numeroManifesto: true
            },
            orderBy: { 
              id: 'desc' 
            }
          });
          
          // Filtra e converte para números inteiros
          const numerosManifesto = todosControles
            .map(controle => controle.numeroManifesto)
            .filter((num): num is string => {
              if (!num) return false;
              // Verifica se é um número inteiro positivo
              return /^\d+$/.test(num) && !num.startsWith('0');
            })
            .map(num => parseInt(num, 10));
          
          // Encontra o maior número ou usa 0 se não houver nenhum
          const ultimoNumero = numerosManifesto.length > 0 
            ? Math.max(...numerosManifesto) 
            : 0;
            
          // Gera o próximo número sequencial
          numeroManifestoFinal = (ultimoNumero + 1).toString();
          console.log('Último número de manifesto:', ultimoNumero, '| Novo número:', numeroManifestoFinal);
        }

        // Garantir que a transportadora tenha um valor válido
        const transportadoraValida = transportadora || 'ACERT';
        
        // Criar o controle com os dados fornecidos
        const controle = await prisma.controleCarga.create({
          data: {
            motorista: motorista.trim(),
            cpfMotorista: cpfMotorista.replace(/[\D]/g, ''),
            responsavel: responsavel.trim(),
            transportadora: transportadoraValida as Transportadora,
            numeroManifesto: numeroManifestoFinal,
            qtdPallets: qtdPallets ? Number(qtdPallets) : 0,
            observacao: observacao ? observacao.trim() : null,
            finalizado: false,
            // Vincula as notas diretamente na criação
            ...(notasIds && notasIds.length > 0 && {
              notas: {
                connect: notasIds.map((id: string) => ({ id }))
              }
            })
          },
          include: {
            notas: true
          }
        });
        
        res.status(201).json(controle);
      } catch (error: any) {
        console.error('Erro ao criar controle:', error);
        
        // Se for um erro de validação do Prisma
        if (error.code === 'P2002') {
          // Erro de violação de chave única
          const field = error.meta?.target?.[0] || 'campo';
          return res.status(400).json({
            error: `Já existe um registro com este ${field}`,
            field,
            code: 'DUPLICATE_ENTRY'
          });
        }
        
        // Outros erros do Prisma
        if (error.code?.startsWith('P2')) {
          return res.status(400).json({
            error: 'Erro de validação',
            details: error.message
          });
        }
        
        res.status(500).json({ 
          error: 'Erro ao criar controle',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      break;
    }
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
