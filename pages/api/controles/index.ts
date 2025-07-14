import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, PrismaClient } from '@prisma/client';
import { gerarProximoNumeroManifesto } from '../../../lib/gerarNumeroManifesto';

const prisma = new PrismaClient();

type Transportadora = 'ACERT' | 'EXPRESSO_GOIAS'; // Removido ACCERT que não é mais usado

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
        
        // Adiciona cabeçalhos para evitar cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.status(200).json(controles);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar controles' });
      }
      break;
    }
    case 'POST': {
      try {
        const { 
          motorista, 
          responsavel, 
          cpfMotorista = 'PENDENTE', 
          transportadora, 
          qtdPallets, 
          observacao, 
          numeroManifesto, 
          notasIds,
          assinaturaMotorista,
          assinaturaResponsavel,
          dataAssinaturaMotorista,
          dataAssinaturaResponsavel
        } = req.body;

        // Validar campos obrigatórios
        const camposObrigatorios = [];
        if (!motorista?.trim()) camposObrigatorios.push('motorista');
        if (!responsavel?.trim()) camposObrigatorios.push('responsavel');
        
        // CPF do motorista é opcional, se não for fornecido, usamos 'PENDENTE'
        const cpfMotoristaFormatado = cpfMotorista?.trim() || 'PENDENTE';

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

        // Garantir que a transportadora tenha um valor válido
        const transportadoraValida = (transportadora === 'ACERT' || transportadora === 'EXPRESSO_GOIAS') 
          ? transportadora 
          : 'ACERT';
          
        // Gera o próximo número de manifesto automaticamente
        const numeroManifestoFinal = numeroManifesto || await gerarProximoNumeroManifesto(transportadoraValida);
        
        // Criar o controle com os dados fornecidos
        const controle = await prisma.controleCarga.create({
          data: {
            motorista: motorista.trim(),
            cpfMotorista: cpfMotorista ? cpfMotorista.replace(/[\D]/g, '') : 'PENDENTE',
            responsavel: responsavel.trim(),
            transportadora: transportadoraValida as Transportadora,
            numeroManifesto: numeroManifestoFinal,
            qtdPallets: qtdPallets ? Number(qtdPallets) : 0,
            observacao: observacao ? observacao.trim() : null,
            finalizado: false,
            // Campos de assinatura
            ...(assinaturaMotorista && { assinaturaMotorista }),
            ...(assinaturaResponsavel && { assinaturaResponsavel }),
            ...(dataAssinaturaMotorista && { dataAssinaturaMotorista: new Date(dataAssinaturaMotorista) }),
            ...(dataAssinaturaResponsavel && { dataAssinaturaResponsavel: new Date(dataAssinaturaResponsavel) }),
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
