import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCookies, verifyToken } from '../../../lib/auth';
import PrinterIntegration from '../../../utils/printer-integration';

interface Printer {
  name: string;
  driver: string;
  port: string;
  isDefault: boolean;
  isInstalled: boolean;
  status: string;
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

// Instância da integração de impressoras
const printerIntegration = new PrinterIntegration();

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Detectar impressoras instaladas
    try {
      // Verificar autenticação
      const token = getTokenFromCookies(req);
      if (!token) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const decoded = await verifyToken(token, process.env.JWT_SECRET || 'seu_segredo_secreto');
      if (!decoded || !decoded.id) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      console.log('[API] Detectando impressoras instaladas...');
      const installedPrinters = await printerIntegration.detectPrinters();
      
      // Encontrar impressora padrão (qualquer uma)
      const defaultPrinter = installedPrinters.find((p: Printer) => 
        p.isDefault && p.isInstalled
      );
      
      // Se não tiver padrão, procurar qualquer impressora instalada
      const availablePrinter = defaultPrinter || installedPrinters.find((p: Printer) => 
        p.isInstalled
      );
      
      // Verificar se tem impressora Zebra (prioridade)
      const zebraPrinter = installedPrinters.find((p: Printer) => 
        p.isInstalled && p.name.includes('Zebra')
      );
      
      console.log(`[API] ${installedPrinters.length} impressoras detectadas`);
      console.log(`[API] Impressora padrão: ${defaultPrinter?.name || 'Nenhuma'}`);
      console.log(`[API] Impressora disponível: ${availablePrinter?.name || 'Nenhuma'}`);
      console.log(`[API] Impressora Zebra: ${zebraPrinter?.name || 'Nenhuma'}`);
      
      return res.status(200).json({
        printers: installedPrinters,
        defaultPrinter: zebraPrinter || availablePrinter || null,
        hasZebraPrinter: !!zebraPrinter,
        isWindows: process.platform === 'win32'
      });

    } catch (error) {
      console.error('Erro ao detectar impressoras:', error);
      return res.status(500).json({ 
        error: 'Erro ao detectar impressoras',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  if (req.method === 'POST') {
    // Imprimir diretamente na impressora
    try {
      // Verificar autenticação
      const token = getTokenFromCookies(req);
      if (!token) {
        return res.status(401).json({ error: 'Não autenticado' });
      }

      const decoded = await verifyToken(token, process.env.JWT_SECRET || 'seu_segredo_secreto');
      if (!decoded || !decoded.id) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const { zplData, printerName } = req.body;

      if (!zplData) {
        return res.status(400).json({ 
          error: 'Dados ZPL são obrigatórios' 
        });
      }

      // Detectar impressoras para validar
      const installedPrinters = await printerIntegration.detectPrinters();
      
      let targetPrinter = null;
      if (printerName) {
        targetPrinter = installedPrinters.find((p: Printer) => p.name === printerName && p.isInstalled);
      } else {
        // Usar primeira impressora disponível (prioridade Zebra)
        targetPrinter = installedPrinters.find((p: Printer) => p.isInstalled && p.name.includes('Zebra')) ||
                      installedPrinters.find((p: Printer) => p.isInstalled);
      }

      if (!targetPrinter) {
        return res.status(400).json({ 
          error: 'Nenhuma impressora instalada encontrada',
          availablePrinters: installedPrinters.filter((p: Printer) => p.isInstalled).map((p: Printer) => p.name)
        });
      }

      console.log(`[API] Enviando para impressora: ${targetPrinter.name}`);
      
      // Enviar para impressora usando integração real
      const success = await printerIntegration.sendToPrinter(zplData, targetPrinter.name);

      if (success) {
        return res.status(200).json({ 
          success: true,
          message: `Etiquetas enviadas para impressora: ${targetPrinter.name}`,
          printer: targetPrinter.name,
          printedAt: new Date().toISOString()
        });
      } else {
        throw new Error('Falha ao enviar para impressora');
      }

    } catch (error) {
      console.error('Erro ao imprimir:', error);
      return res.status(500).json({ 
        error: 'Erro ao processar impressão',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}

export default allowCors(handler);
