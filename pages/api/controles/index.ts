import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, PrismaClient } from '@prisma/client';
import { gerarProximoNumeroManifesto } from '../../../lib/gerarNumeroManifesto';

const prisma = new PrismaClient();

type Transportadora = 'ACERT' | 'EXPRESSO_GOIAS' | 'TERCEIRIZADA'; // Removido ACCERT que não é mais usado

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET': {
      try {
        const controles = await prisma.controleCarga.findMany({
          orderBy: { dataCriacao: 'desc' },
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
            notas: true,
          },
        });
        
        // Processar controles para identificar RETIRA_VENDEDOR pelo marcador [RV]
        const controlesProcessados = controles.map(controle => {
          let transportadora = controle.transportadora;
          let motorista = controle.motorista;
          
          // Se o motorista tem marcador [RV], é RETIRA_VENDEDOR
          if (controle.motorista.includes('[RV]')) {
            transportadora = 'RETIRA_VENDEDOR' as any;
            motorista = controle.motorista.replace(' [RV]', '');
          }
          
          return {
            ...controle,
            motorista,
            transportadora
          };
        });
        
        // Adiciona cabeçalhos para evitar cache
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.status(200).json(controlesProcessados);
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
          qtdPalletsLevados,
          qtdPalletsDevolvidos,
          placaVeiculo,
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
        const transportadoraValida = (['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE'].includes(transportadora)) 
          ? transportadora 
          : 'ACCERT';

        // SOLUÇÃO TEMPORÁRIA: Mapear RETIRA_VENDEDOR para TERCEIRIZADA no banco (igual aos motoristas)
        let transportadoraParaBanco = transportadoraValida;
        let motoristaParaSalvar = motorista.trim();
        
        if (transportadoraValida === 'RETIRA_VENDEDOR') {
          transportadoraParaBanco = 'TERCEIRIZADA';
          // Adicionar marcador [RV] no nome do motorista para identificar depois
          if (!motoristaParaSalvar.includes('[RV]')) {
            motoristaParaSalvar = `${motoristaParaSalvar} [RV]`;
          }
          console.log('[Controle] Mapeando RETIRA_VENDEDOR -> TERCEIRIZADA para compatibilidade');
        }
        // ACCERT e RETIRA_CLIENTE já estão no enum, não precisam de mapeamento
        else if (transportadoraValida === 'ACCERT' || transportadoraValida === 'RETIRA_CLIENTE') {
          console.log(`[Controle] Usando ${transportadoraValida} diretamente (já no enum)`);
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
        
        // Se foi mapeado RETIRA_VENDEDOR, ajustar o retorno
        if (transportadoraValida === 'RETIRA_VENDEDOR') {
          (controle as any).transportadora = 'RETIRA_VENDEDOR';
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
