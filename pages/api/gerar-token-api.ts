import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username e password são obrigatórios' 
      });
    }

    console.log('[Token API] Tentando gerar token para:', username);

    // Fazer login na API externa
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    params.append('grant_type', 'password');

    const response = await axios.post(
      'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/token',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, token_type, expires_in } = response.data;

    console.log('[Token API] Token gerado com sucesso');

    return res.status(200).json({
      success: true,
      message: 'Token gerado com sucesso',
      data: {
        access_token,
        token_type,
        expires_in,
        expires_at: new Date(Date.now() + expires_in * 1000).toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Token API] Erro ao gerar token:', error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar token',
      error: error.response?.data || error.message,
      details: {
        apiUrl: 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/token',
        timestamp: new Date().toISOString()
      }
    });
  }
}
