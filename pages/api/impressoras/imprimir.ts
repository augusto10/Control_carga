import { NextApiRequest, NextApiResponse } from 'next';
import PrinterIntegration from '../../../utils/printer-integration';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://controle-carga-web.vercel.app',
  /^https:\/\/.*\.vercel\.app$/
];

// Middleware CORS
const allowCors = (fn: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin || '';
  
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return await fn(req, res);
  } catch (error) {
    console.error('Erro no handler:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const printerIntegration = new PrinterIntegration();
const isProduction = process.env.NODE_ENV === 'production';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Listar impressoras disponíveis
    try {
      const printers = await printerIntegration.detectPrinters();
      return res.status(200).json(printers);
    } catch (error) {
      console.error('Erro ao listar impressoras:', error);
      return res.status(500).json({ error: 'Erro ao listar impressoras' });
    }
  }

  if (req.method === 'POST') {
    // Imprimir etiquetas
    try {
      const { zplData, printer, loteData } = req.body;

      if (!zplData || !printer) {
        return res.status(400).json({ 
          error: 'Dados ZPL e nome da impressora são obrigatórios' 
        });
      }

      console.log(`[API] Enviando impressão para: ${printer}`);
      console.log(`[API] Ambiente: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
      console.log(`[API] Tamanho do ZPL: ${zplData.length} caracteres`);

      // Em produção, retornar ZPL para download
      if (isProduction) {
        console.log(`[API] Retornando ZPL para download (ambiente de produção)`);
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="etiquetas-${loteData?.numeroPedido || loteData?.numeroNota || 'etiqueta'}-${Date.now()}.zpl"`);
        res.write(zplData);
        res.end();
        return;
      }

      // Em desenvolvimento, tentar enviar para impressora real
      const success = await printerIntegration.sendToPrinter(zplData, printer);
      
      if (success) {
        console.log(`[API] Impressão enviada com sucesso para ${printer}`);
        
        return res.status(200).json({ 
          success: true,
          message: `Etiquetas enviadas para impressora: ${printer}`,
          printer: printer,
          loteData: loteData
        });
      } else {
        throw new Error('Falha ao enviar para impressora');
      }

    } catch (error) {
      console.error('Erro ao imprimir etiquetas:', error);
      
      return res.status(500).json({ 
        error: 'Erro ao processar impressão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}

export default allowCors(handler);
