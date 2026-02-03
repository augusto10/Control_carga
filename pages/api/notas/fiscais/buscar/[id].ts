import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const API_EXTERNA_BASE = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar método HTTP
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ 
      message: 'ID do pedido é obrigatório',
      error: 'ID_INVALIDO'
    });
  }

  try {
    // Fazer login para obter token
    const loginResponse = await axios.post(
      `${API_EXTERNA_BASE}/token`,
      new URLSearchParams({
        username: process.env.API_EXTERNA_USERNAME || 'erp@santri.com.br',
        password: process.env.API_EXTERNA_PASSWORD || 'PASSkey@2025',
        grant_type: 'password'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = loginResponse.data;
    
    // Buscar pedido específico
    const response = await axios.get(
      `${API_EXTERNA_BASE}/api/v1/pedidos/${id}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'accept': 'application/json'
        }
      }
    );

    // Retornar dados do pedido
    return res.status(200).json(response.data);
    
  } catch (error: any) {
    console.error('[API Buscar Pedido] Erro:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        message: 'Pedido não encontrado',
        error: 'PEDIDO_NAO_ENCONTRADO'
      });
    }
    
    return res.status(500).json({ 
      message: 'Erro ao buscar pedido',
      error: error.response?.data || error.message
    });
  }
}
