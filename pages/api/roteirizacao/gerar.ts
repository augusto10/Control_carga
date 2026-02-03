import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { RoteirizacaoService } from '../../../services/roteirizacao';
import { apiExternaService } from '../../../services/api-externa';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { 
      notasIds, 
      estrategia = 'cidade', 
      capacidadeBox = 10,
      incluirDadosAPI = false 
    } = req.body;

    if (!notasIds || !Array.isArray(notasIds) || notasIds.length === 0) {
      return res.status(400).json({ 
        message: 'IDs das notas são obrigatórios' 
      });
    }

    console.log('[Roteirização] Iniciando geração de rotas:', { 
      notasIds, 
      estrategia, 
      capacidadeBox 
    });

    // Buscar notas no banco local
    const notas = await prisma.notaFiscal.findMany({
      where: {
        id: { in: notasIds }
      },
      orderBy: { dataCriacao: 'desc' }
    });

    if (notas.length === 0) {
      return res.status(404).json({ 
        message: 'Nenhuma nota fiscal encontrada' 
      });
    }

    // Se solicitado, enriquecer com dados da API externa
    let notasEnriquecidas = notas.map(nota => ({
      ...nota,
      cliente: nota.cliente || '',
      endereco: nota.endereco || '',
      cidade: nota.cidade || '',
      estado: nota.estado || '',
      bairro: nota.bairro || '',
      cep: nota.cep || '',
      volumes: nota.volumes || '1',
      peso: 0,
      valor: 0
    }));
    
    if (incluirDadosAPI) {
      const username = process.env.API_EXTERNA_USERNAME || 'admin';
      const password = process.env.API_EXTERNA_PASSWORD || 'password';

      notasEnriquecidas = await Promise.all(
        notasEnriquecidas.map(async (nota) => {
          try {
            // Extrair número e série do código de barras ou do número da nota
            const numero = nota.numeroNota;
            const serie = '1'; // Assumir série padrão

            const notaExterna = await apiExternaService.buscarNotaFiscalPorNumeroSerie(
              numero,
              serie,
              username,
              password
            );

            if (notaExterna) {
              return {
                ...nota,
                cliente: notaExterna.cliente?.nome || nota.cliente,
                endereco: notaExterna.cliente?.endereco || nota.endereco,
                cidade: notaExterna.cliente?.cidade || nota.cidade,
                estado: notaExterna.cliente?.estado || nota.estado,
                volumes: notaExterna.volumes ? notaExterna.volumes.toString() : nota.volumes,
                peso: notaExterna.peso || 0,
                valor: notaExterna.valor || 0
              };
            }

            return nota;
          } catch (error) {
            console.error(`[Roteirização] Erro ao enriquecer nota ${nota.id}:`, error);
            return nota;
          }
        })
      );
    }

    // Converter para formato esperado pelo serviço de roteirização
    const notasFormatadas = notasEnriquecidas.map(nota => ({
      id: nota.id,
      numero: nota.numeroNota,
      serie: '1', // Assumir série padrão
      cliente: {
        nome: nota.cliente,
        endereco: nota.endereco,
        cidade: nota.cidade,
        estado: nota.estado,
        bairro: nota.bairro,
        cep: nota.cep
      },
      volumes: parseInt(nota.volumes) || 1,
      peso: nota.peso || 0,
      valor: nota.valor || 0,
      dataEmissao: nota.dataCriacao?.toISOString()
    }));

    // Gerar rotas
    const rotas = RoteirizacaoService.criarRotas(notasFormatadas, estrategia);
    
    // Otimizar rotas
    const rotasOtimizadas = RoteirizacaoService.otimizarRotas(rotas);
    
    // Criar boxes
    const boxes = RoteirizacaoService.criarBoxes(rotasOtimizadas, capacidadeBox);
    
    // Gerar relatório
    const relatorio = RoteirizacaoService.gerarRelatorio(rotasOtimizadas, boxes);

    // Salvar roteirização no banco (opcional)
    // Nota: Precisa executar migration para criar a tabela roteirizacao
    // const roteirizacaoCriada = await prisma.roteirizacao.create({
    //   data: {
    //     notasIds: notasIds,
    //     estrategia,
    //     capacidadeBox,
    //     rotas: JSON.stringify(rotasOtimizadas),
    //     boxes: JSON.stringify(boxes),
    //     relatorio,
    //     dataCriacao: new Date(),
    //     criadoPor: 'system' // TODO: Obter ID do usuário autenticado
    //   }
    // });

    console.log('[Roteirização] Rotas geradas com sucesso:', {
      // roteirizacaoId: roteirizacaoCriada.id,
      totalRotas: rotasOtimizadas.length,
      totalBoxes: boxes.length
    });

    res.status(200).json({
      // id: roteirizacaoCriada.id,
      rotas: rotasOtimizadas,
      boxes,
      relatorio,
      estatisticas: {
        totalNotas: notas.length,
        totalRotas: rotasOtimizadas.length,
        totalBoxes: boxes.length,
        estrategia,
        capacidadeBox
      }
    });

  } catch (error: any) {
    console.error('[Roteirização] Erro ao gerar rotas:', error);
    res.status(500).json({ 
      message: 'Erro ao gerar rotas',
      error: error.message 
    });
  } finally {
    await prisma.$disconnect();
  }
}
