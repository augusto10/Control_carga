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
    const { numero, serie, chave } = req.query;

    if (!numero && !chave) {
      return res.status(400).json({ 
        message: 'Parâmetros obrigatórios: numero + serie ou chave' 
      });
    }

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      return res.status(500).json({ 
        message: 'Credenciais da API externa não configuradas' 
      });
    }

    // Fazer login para obter token
    const loginParams = new URLSearchParams();
    loginParams.append('username', username);
    loginParams.append('password', password);
    loginParams.append('grant_type', 'password');

    const loginResponse = await axios.post(
      'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/token',
      loginParams,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = loginResponse.data;

    let notaExterna = null;

    if (chave && typeof chave === 'string') {
      // Buscar por chave
      const response = await axios.get(
        `http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/notas-fiscais/chave/${chave}`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );
      notaExterna = response.data;
    } else if (numero && serie && typeof numero === 'string' && typeof serie === 'string') {
      // Buscar por número e série
      const response = await axios.get(
        `http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com/api/v1/notas-fiscais?numero=${numero}&serie=${serie}`,
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );
      
      // Filtrar a nota específica do array de resultados
      const notas = response.data?.data || [];
      notaExterna = notas.find((nota: any) => 
        nota.numero === numero && nota.serie === serie
      );
    }

    if (!notaExterna) {
      return res.status(404).json({ 
        message: 'Nota fiscal não encontrada na API externa' 
      });
    }

    res.status(200).json(notaExterna);
  } catch (error: any) {
    console.error('[API Nota Externa] Erro:', error.response?.data || error.message);
    res.status(500).json({ 
      message: 'Erro ao buscar nota fiscal na API externa',
      error: error.response?.data || error.message 
    });
  }
}
