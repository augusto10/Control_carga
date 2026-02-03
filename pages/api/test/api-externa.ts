import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '../../../services/api-externa';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    console.log('[API Test] Iniciando teste de conexão com API externa');

    // Teste 1: Login
    console.log('[API Test] Testando login...');
    const username = process.env.API_EXTERNA_USERNAME || 'admin';
    const password = process.env.API_EXTERNA_PASSWORD || 'password';
    
    const token = await apiExternaService.login(username, password);
    
    if (!token) {
      return res.status(500).json({
        success: false,
        message: 'Falha no login',
        test: 'login'
      });
    }

    // Teste 2: Buscar nota fiscal (teste com dados fictícios)
    console.log('[API Test] Testando busca de nota fiscal...');
    const notaTest = await apiExternaService.buscarNotaFiscalPorNumeroSerie(
      '123',
      '1',
      username,
      password
    );

    // Teste 3: Buscar cliente (se tiver nota)
    let clienteTest = null;
    if (notaTest?.cliente?.id) {
      console.log('[API Test] Testando busca de cliente...');
      clienteTest = await apiExternaService.buscarCliente(
        notaTest.cliente.id,
        username,
        password
      );
    }

    const resultado = {
      success: true,
      message: 'Teste de API externa concluído',
      tests: {
        login: {
          success: !!token,
          message: token ? 'Login realizado com sucesso' : 'Falha no login',
          token: token ? '***TOKEN_OK***' : null
        },
        buscaNota: {
          success: !!notaTest,
          message: notaTest ? 'Nota fiscal encontrada' : 'Nota fiscal não encontrada (pode ser normal)',
          data: notaTest || null
        },
        buscaCliente: {
          success: !!clienteTest,
          message: clienteTest ? 'Cliente encontrado' : 'Cliente não encontrado ou não testado',
          data: clienteTest || null
        }
      },
      config: {
        apiUrl: 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com',
        username,
        timestamp: new Date().toISOString()
      }
    };

    console.log('[API Test] Resultado:', JSON.stringify(resultado, null, 2));
    
    return res.status(200).json(resultado);

  } catch (error: any) {
    console.error('[API Test] Erro no teste:', error);
    
    // Garantir que o erro seja uma string válida
    const errorMessage = typeof error.message === 'string' ? error.message : 'Erro desconhecido';
    
    return res.status(500).json({
      success: false,
      message: 'Erro ao testar API externa',
      error: errorMessage,
      details: {
        apiUrl: 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com',
        timestamp: new Date().toISOString()
      }
    });
  }
}
