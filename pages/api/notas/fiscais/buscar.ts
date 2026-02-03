import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../../../services/api-externa';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { numeroPedido } = req.query;
  const username = process.env.API_EXTERNA_USERNAME || 'erp@santri.com.br';
  const password = process.env.API_EXTERNA_PASSWORD || 'PASSkey@2025';

  console.log('[API Buscar] Iniciando busca para pedido:', numeroPedido);
  console.log('[API Buscar] Usuário:', username);

  try {
    if (!numeroPedido || typeof numeroPedido !== 'string') {
      console.error('[API Buscar] Número do pedido inválido:', numeroPedido);
      return res.status(400).json({ 
        error: 'Parâmetro numeroPedido é obrigatório',
        debug: {
          numeroPedido,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log('[API Buscar] Chamando apiExternaService.buscarPedidoPorNumero...');
    const pedidos = await apiExternaService.buscarPedidoPorNumero(
      numeroPedido,
      username,
      password
    );

    console.log('[API Buscar] Resposta de buscarPedidoPorNumero recebida');
    console.log('[API Buscar] Tipo da resposta:', typeof pedidos);
    
    if (!pedidos) {
      console.error('[API Buscar] Nenhum pedido encontrado ou erro na API externa');
      return res.status(404).json({ 
        error: 'Erro ao buscar pedidos na API externa ou pedido não encontrado',
        debug: {
          numeroPedido,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log(`[API Buscar] ${pedidos.length} pedido(s) encontrado(s)`);
    
    // Log detalhado do primeiro pedido (se existir)
    if (pedidos.length > 0) {
      console.log('[API Buscar] Dados do primeiro pedido:', JSON.stringify(pedidos[0], null, 2));
    } else {
      console.log('[API Buscar] A lista de pedidos está vazia');
    }

    // Mantendo a estrutura de resposta esperada pelo frontend { data: [...] }
    const response = { data: pedidos };
    console.log('[API Buscar] Enviando resposta para o cliente');
    return res.status(200).json(response);

  } catch (error: any) {
    console.error('[API Buscar] Erro durante a busca:', error);
    console.error('[API Buscar] Stack trace:', error.stack);
    
    return res.status(500).json({ 
      error: 'Erro interno do servidor ao processar a requisição',
      detail: error.message,
      debug: {
        numeroPedido,
        timestamp: new Date().toISOString(),
        errorType: error.name,
        errorCode: error.code
      }
    });
  }
}
