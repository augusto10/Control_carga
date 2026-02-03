import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../../../services/api-externa';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { numeroPedido } = req.query;
  
  if (!numeroPedido || Array.isArray(numeroPedido)) {
    return res.status(400).json({ 
      message: 'Número do pedido é obrigatório',
      error: 'NUMERO_PEDIDO_INVALIDO'
    });
  }

  const username = process.env.API_EXTERNA_USERNAME || 'erp@santri.com.br';
  const password = process.env.API_EXTERNA_PASSWORD || 'PASSkey@2025';

  try {
    console.log(`[API Buscar Nota por Pedido] Buscando nota fiscal para o pedido: ${numeroPedido}`);
    
    // 1. Primeiro, tenta buscar a nota fiscal diretamente pelo número do pedido
    const notaFiscal = await apiExternaService.buscarNotaFiscalPorNumeroPedido(
      numeroPedido,
      username,
      password
    );

    if (notaFiscal) {
      console.log(`[API Buscar Nota por Pedido] Nota fiscal encontrada para o pedido ${numeroPedido}:`, notaFiscal.numero);
      return res.status(200).json(notaFiscal);
    }

    // 2. Se não encontrou, tenta buscar o pedido primeiro para obter mais informações
    console.log(`[API Buscar Nota por Pedido] Nenhuma nota encontrada diretamente, buscando pedido...`);
    const pedidos = await apiExternaService.buscarPedidoPorNumero(
      numeroPedido,
      username,
      password
    );

    if (!pedidos || pedidos.length === 0) {
      console.log(`[API Buscar Nota por Pedido] Nenhum pedido encontrado com o número: ${numeroPedido}`);
      return res.status(404).json({ 
        message: 'Nenhum pedido encontrado',
        error: 'PEDIDO_NAO_ENCONTRADO'
      });
    }

    const pedido = pedidos[0];
    console.log(`[API Buscar Nota por Pedido] Pedido encontrado:`, pedido.ID);

    // 3. Tenta obter o número da nota fiscal a partir dos campos do pedido
    const possiveisCamposNota = [
      'NOTA_FISCAL',
      'NUMERO_NOTA_FISCAL',
      'NOTA_FISCAL_NUMERO',
      'NF_NUMERO',
      'NUMERO_NF'
    ];

    for (const campo of possiveisCamposNota) {
      if (pedido[campo]) {
        const numeroNota = pedido[campo].toString().trim();
        if (numeroNota) {
          console.log(`[API Buscar Nota por Pedido] Número da nota encontrado no campo ${campo}:`, numeroNota);
          
          // Tenta buscar a nota fiscal completa com o número encontrado
          const notaCompleta = await apiExternaService.buscarNotaFiscalPorNumeroSerie(
            numeroNota,
            '1', // Série padrão, pode ser ajustado conforme necessário
            username,
            password
          );

          if (notaCompleta) {
            return res.status(200).json(notaCompleta);
          }
          
          // Se não encontrou a nota completa, retorna pelo menos o número
          return res.status(200).json({
            numero: numeroNota,
            origem: `campo_${campo}`
          });
        }
      }
    }

    // Se chegou até aqui, não encontrou a nota fiscal
    console.log(`[API Buscar Nota por Pedido] Nenhuma nota fiscal encontrada para o pedido ${numeroPedido}`);
    return res.status(404).json({ 
      message: 'Nenhuma nota fiscal encontrada para este pedido',
      error: 'NOTA_FISCAL_NAO_ENCONTRADA',
      pedidoId: pedido.ID
    });

  } catch (error: any) {
    console.error(
      '[API Buscar Nota por Pedido] Erro ao buscar nota fiscal:',
      error.response?.data || error.message
    );
    
    return res.status(500).json({ 
      message: 'Erro ao buscar nota fiscal',
      error: error.response?.data || error.message,
      details: error.stack
    });
  }
}
