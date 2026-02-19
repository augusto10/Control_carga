import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    console.log('[Test Listar Notas] Iniciando teste de listagem de notas');

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;
    const apiUrl = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';

    if (!username || !password) {
      return res.status(500).json({ 
        message: 'Credenciais da API externa não configuradas' 
      });
    }

    // Primeiro, fazer login para obter o token
    console.log('[Test Listar Notas] Fazendo login...');
    const loginParams = new URLSearchParams();
    loginParams.append('username', username);
    loginParams.append('password', password);
    loginParams.append('grant_type', 'password');

    const loginResponse = await axios.post(
      `${apiUrl}/token`,
      loginParams,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = loginResponse.data;
    console.log('[Test Listar Notas] Login realizado com sucesso');

    // Agora listar as notas fiscais
    console.log('[Test Listar Notas] Listando notas fiscais...');
    const notasResponse = await axios.get(
      `${apiUrl}/api/v1/notas-fiscais?limit=10&offset=0`,
      {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    console.log('[Test Listar Notas] Notas listadas com sucesso');
    
    return res.status(200).json({
      success: true,
      message: 'Listagem de notas fiscais testada com sucesso',
      data: {
        notas: notasResponse.data,
        total: notasResponse.data?.length || 0,
        limit: 10,
        offset: 0
      },
      config: {
        apiUrl,
        username,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Test Listar Notas] Erro:', error.response?.data || error.message);
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao testar listagem de notas fiscais',
      error: error.response?.data || error.message,
      details: {
        apiUrl: 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com',
        timestamp: new Date().toISOString()
      }
    });
  }
}
