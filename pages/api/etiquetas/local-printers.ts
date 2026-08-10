import { execFile } from 'child_process';
import { promisify } from 'util';
import { NextApiRequest, NextApiResponse } from 'next';
import { TipoUsuario } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/server-auth';

const execFileAsync = promisify(execFile);
const ALLOWED_ROLES: TipoUsuario[] = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'FUNCIONARIO'];

type PrinterInfo = {
  Name?: string;
  DriverName?: string;
  PortName?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req);

  if (!user || !user.ativo) {
    return res.status(401).json({ message: 'Nao autorizado.' });
  }

  if (!ALLOWED_ROLES.includes(user.tipo)) {
    return res.status(403).json({ message: 'Voce nao tem permissao para consultar impressoras locais.' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Metodo nao permitido.' });
  }

  try {
    const command = 'Get-Printer | Select-Object Name,DriverName,PortName | ConvertTo-Json -Compress';
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-Command', command],
      { timeout: 10000, windowsHide: true, maxBuffer: 1024 * 1024 }
    );

    const parsed = stdout?.trim() ? JSON.parse(stdout) : [];
    const printers = (Array.isArray(parsed) ? parsed : [parsed])
      .map((item: PrinterInfo) => (typeof item?.Name === 'string' ? item.Name.trim() : ''))
      .filter(Boolean);

    return res.status(200).json({ printers: Array.from(new Set(printers)) });
  } catch (error) {
    console.error('[etiquetas/local-printers] Erro ao consultar impressoras locais:', error);
    return res.status(500).json({ message: 'Nao foi possivel consultar as impressoras locais do Windows.' });
  }
}
