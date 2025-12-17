import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { gerarProximoNumeroManifesto } from '../../../lib/gerarNumeroManifesto';
import prisma from '@/lib/prisma';


type Transportadora = 'ACCERT' | 'EXPRESSO_GOIAS' | 'TERCEIRIZADA' | 'DETAFRA_TRANSPORTES' | 'RETIRA_VENDEDOR' | 'RETIRA_CLIENTE' | 'VLOG';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': {
      try {
        const { start, end, transportadora, notaFiscal, motorista, responsavel, limit } = req.query;
        
        console.log('🔍 [Controles] Filtros recebidos:', { start, end, transportadora, notaFiscal, motorista, responsavel, limit });
        
        // Construir filtros
        const where: any = {};
        
        // Filtro por data
        if (start || end) {
          where.dataCriacao = {};
          if (start) {
            where.dataCriacao.gte = new Date(`${start}T00:00:00`);
            console.log('📅 [Controles] Data início:', where.dataCriacao.gte);
          }
          if (end) {
            where.dataCriacao.lte = new Date(`${end}T23:59:59`);
            console.log('📅 [Controles] Data fim:', where.dataCriacao.lte);
          }
        }
        
        // Filtro por transportadora
        if (transportadora) {
          where.transportadora = transportadora as string;
        }
        
        // Filtro por nota fiscal (busca nas notas vinculadas)
        if (notaFiscal) {
          where.notas = {
            some: {
              numeroNota: {
                contains: notaFiscal as string,
                mode: 'insensitive'
              }
            }
          };
        }
        
        // Filtro por motorista
        if (motorista) {
          where.motorista = {
            contains: motorista as string,
            mode: 'insensitive'
          };
        }
        
        // Filtro por responsável
        if (responsavel) {
          where.responsavel = {
            contains: responsavel as string,
            mode: 'insensitive'
          };
        }
        
        // Definir limite (padrão: últimos 50, máximo: 500)
        const limitNum = limit ? Math.min(parseInt(limit as string), 500) : 50;
        
        console.log('🔍 [Controles] Where construído:', where);
        console.log('📊 [Controles] Limite aplicado:', limitNum);
        
        // Usar type assertion para resolver problemas de tipo com imagens
        const controles = await (prisma.controleCarga.findMany as any)({
          where,
          orderBy: { dataCriacao: 'desc' },
          take: limitNum,
          select: {
            id: true,
            motorista: true,
            cpfMotorista: true,
            responsavel: true,
            transportadora: true,
            numeroManifesto: true,
            // Campo antigo ainda existente
            qtdPallets: true,
            // Novos campos de pallets
            qtdPalletsLevados: true,
            qtdPalletsDevolvidos: true,
            observacao: true,
            finalizado: true,
            dataCriacao: true,
            // Seleciona placaVeiculo para exibir no PDF e na lista
            placaVeiculo: true,
            // Campos de assinatura digital
            assinaturaMotorista: true,
            assinaturaResponsavel: true,
            dataAssinaturaMotorista: true,
            dataAssinaturaResponsavel: true,
            // Campo de imagens
            imagens: true,
            notas: true,
          },
        });
        
        // Processar controles para identificar RETIRA_VENDEDOR e VLOG pelos marcadores
        const controlesProcessados = controles.map((controle: any) => {
          let transportadora = controle.transportadora;
          let motorista = controle.motorista;
          
          // Se o motorista tem marcador [RV], é RETIRA_VENDEDOR
          if (controle.motorista.includes('[RV]')) {
            transportadora = 'RETIRA_VENDEDOR' as any;
            motorista = controle.motorista.replace(' [RV]', '');
          }
          
          // Se o motorista tem marcador [VLOG], é VLOG
          if (controle.motorista.includes('[VLOG]')) {
            transportadora = 'VLOG' as any;
            motorista = controle.motorista.replace(' [VLOG]', '');
          }
          
          return {
            ...controle,
            motorista,
            transportadora
          };
        });
        
        console.log(`📊 [Controles] Encontrados ${controles.length} controles com filtros aplicados`);
        
        if (controles.length > 0) {
          console.log('📅 [Controles] Primeiro controle:', {
            id: controles[0].id,
            numeroManifesto: controles[0].numeroManifesto,
            motorista: controles[0].motorista,
            dataCriacao: controles[0].dataCriacao
          });
        }
        
        // Adiciona cabeçalhos para evitar cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.status(200).json(controlesProcessados);
      } catch (error: any) {
        console.error('Erro completo:', error);
        console.error('Stack:', error?.stack);
        res.status(500).json({
          error: 'Erro ao listar controles',
          details: error?.message,
          code: error?.code
        });
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
          qtdPalletsLevados,
          qtdPalletsDevolvidos,
          placaVeiculo,
          observacao, 
          numeroManifesto, 
          notasIds,
          assinaturaMotorista,
          assinaturaResponsavel,
          dataAssinaturaMotorista,
          dataAssinaturaResponsavel,
          imagens
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

        // Normalizar e validar novos campos
        const levadosNum = Number(qtdPalletsLevados ?? 0) || 0;
        const devolvidosNum = Number(qtdPalletsDevolvidos ?? 0) || 0;
        const placaNormalizada = typeof placaVeiculo === 'string' ? placaVeiculo.trim().toUpperCase() : null;

        if (levadosNum < 0 || devolvidosNum < 0) {
          return res.status(400).json({ error: 'Valores de pallets não podem ser negativos.' });
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
        const transportadoraValida = (['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE', 'VLOG'].includes(transportadora)) 
          ? transportadora 
          : 'ACCERT';

        // SOLUÇÃO TEMPORÁRIA: Mapear transportadoras para valores existentes no banco (igual aos motoristas)
        let transportadoraParaBanco = transportadoraValida;
        let motoristaParaSalvar = motorista.trim();
        
        if (transportadoraValida === 'RETIRA_VENDEDOR') {
          transportadoraParaBanco = 'TERCEIRIZADA';
          // Adicionar marcador [RV] no nome do motorista para identificar depois
          motoristaParaSalvar = `${motorista} [RV]`;
        } else if (transportadoraValida === 'VLOG') {
          transportadoraParaBanco = 'TERCEIRIZADA';
          // Adicionar marcador [VLOG] no nome do motorista para identificar depois
          motoristaParaSalvar = `${motorista} [VLOG]`;
        }
          
        // Gera o próximo número de manifesto automaticamente
        const numeroManifestoFinal = numeroManifesto || await gerarProximoNumeroManifesto(transportadoraParaBanco);
        
        // Criar o controle com os dados fornecidos
        const controle = await prisma.controleCarga.create({
          data: {
            motorista: motoristaParaSalvar,
            cpfMotorista: cpfMotorista ? cpfMotorista.replace(/[\D]/g, '') : 'PENDENTE',
            responsavel: responsavel.trim(),
            transportadora: transportadoraParaBanco as Transportadora,
            numeroManifesto: numeroManifestoFinal,
            // Compatibilidade: manter campo antigo como diferença
            qtdPallets: typeof qtdPallets !== 'undefined' ? Number(qtdPallets) || 0 : (levadosNum - devolvidosNum),
            // Novos campos
            qtdPalletsLevados: levadosNum,
            qtdPalletsDevolvidos: devolvidosNum,
            placaVeiculo: placaNormalizada,
            observacao: observacao ? observacao.trim() : null,
            finalizado: false,
            // Campos de assinatura
            ...(assinaturaMotorista && { assinaturaMotorista }),
            ...(assinaturaResponsavel && { assinaturaResponsavel }),
            ...(dataAssinaturaMotorista && { dataAssinaturaMotorista: new Date(dataAssinaturaMotorista) }),
            ...(dataAssinaturaResponsavel && { dataAssinaturaResponsavel: new Date(dataAssinaturaResponsavel) }),
            // Campo de imagens
            imagens: imagens || [],
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
        
        // Se foi mapeado RETIRA_VENDEDOR ou VLOG, ajustar o retorno
        if (transportadoraValida === 'RETIRA_VENDEDOR') {
          (controle as any).transportadora = 'RETIRA_VENDEDOR';
          (controle as any).motorista = motorista.trim(); // Retornar nome sem marcador
        } else if (transportadoraValida === 'VLOG') {
          (controle as any).transportadora = 'VLOG';
          (controle as any).motorista = motorista.trim(); // Retornar nome sem marcador
        }
        // ACCERT e RETIRA_CLIENTE já são salvos corretamente, não precisam ajuste
        
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

