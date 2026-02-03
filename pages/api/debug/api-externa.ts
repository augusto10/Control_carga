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
    console.log('[Debug API] Iniciando diagnóstico da API externa');

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;
    const apiUrl = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';

    console.log('[Debug API] Configurações:', {
      apiUrl,
      username: username ? '***CONFIGURADO***' : 'NÃO CONFIGURADO',
      password: password ? '***CONFIGURADO***' : 'NÃO CONFIGURADO'
    });

    // Teste 1: Verificar se a API está online
    console.log('[Debug API] Testando conectividade...');
    try {
      const healthResponse = await axios.get(apiUrl, { timeout: 5000 });
      console.log('[Debug API] API está online:', healthResponse.status);
    } catch (error: any) {
      console.error('[Debug API] Erro de conectividade:', error.message);
      return res.status(500).json({
        success: false,
        message: 'API externa não está acessível',
        error: error.message,
        step: 'conectividade'
      });
    }

    // Teste 2: Tentar login
    console.log('[Debug API] Testando autenticação...');
    try {
      const params = new URLSearchParams();
      params.append('username', username || '');
      params.append('password', password || '');
      params.append('grant_type', 'password');

      const loginResponse = await axios.post(
        `${apiUrl}/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000
        }
      );

      console.log('[Debug API] Login bem-sucedido');
      
      return res.status(200).json({
        success: true,
        message: 'Diagnóstico concluído com sucesso',
        results: {
          conectividade: 'OK',
          autenticacao: 'OK',
          tokenGerado: !!loginResponse.data.access_token,
          tokenType: loginResponse.data.token_type,
          expiresIn: loginResponse.data.expires_in
        },
        config: {
          apiUrl,
          username: username || 'NÃO CONFIGURADO',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('[Debug API] Erro na autenticação:', error.response?.data || error.message);
      
      return res.status(500).json({
        success: false,
        message: 'Falha na autenticação da API externa',
        error: error.response?.data || error.message,
        step: 'autenticacao',
        config: {
          apiUrl,
          username: username || 'NÃO CONFIGURADO',
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error: any) {
    console.error('[Debug API] Erro geral:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Erro no diagnóstico da API externa',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
