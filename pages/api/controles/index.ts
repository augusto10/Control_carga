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
        const { motorista, responsavel, cpfMotorista, transportadora, qtdPallets, observacao, numeroManifesto } = req.body;

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

        // Se não veio um número de manifesto, gera um sequencial
        let numeroManifestoFinal = numeroManifesto;
        if (!numeroManifestoFinal) {
          const allManifestos = await prisma.controleCarga.findMany({
            where: {
              NOT: {
                numeroManifesto: {
                  startsWith: 'TEMP-'
                }
              }
            },
            select: { numeroManifesto: true },
          });
          
          const maxNum = allManifestos.reduce((max, c) => {
            const n = parseInt(c.numeroManifesto, 10);
            return (!isNaN(n) && n > max) ? n : max;
          }, 0);
          
          numeroManifestoFinal = (maxNum + 1).toString();
        }


        // Garantir que a transportadora tenha um valor válido
        const transportadoraValida = transportadora || 'ACERT';
        
        // Criar o controle com os dados fornecidos
        const controle = await prisma.controleCarga.create({
          data: {
            motorista: motorista.trim(),
            cpfMotorista: cpfMotorista.replace(/[\D]/g, ''),
            responsavel: responsavel.trim(),
            transportadora: transportadoraValida as any, // O Prisma irá converter para o enum correto
            numeroManifesto: numeroManifestoFinal,
            qtdPallets: qtdPallets ? Number(qtdPallets) : 0,
            observacao: observacao ? observacao.trim() : null,
            finalizado: false,
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
        if (error.code?.startsWith('P')) {
          console.error('Erro do Prisma:', error);
          return res.status(400).json({
            error: 'Erro de validação dos dados',
            details: error.message,
            code: 'VALIDATION_ERROR'
          });
        }
        
        // Erro genérico
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        res.status(500).json({ 
          error: 'Erro interno ao processar a requisição',
          message: errorMessage,
          code: 'INTERNAL_SERVER_ERROR'
        });
      }
      break;
    }
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
