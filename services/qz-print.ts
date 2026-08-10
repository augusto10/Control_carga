import qz from 'qz-tray';
import { QzStatus } from '@/types/labels';

const STORAGE_KEY = 'label_preferred_printer';
const AUTO_MATCH = ['zd220', 'zebra', 'zdesigner'];
export const QZ_DOWNLOAD_URL = 'https://qz.io/download/';
const QZ_CONNECT_OPTIONS = {
  host: ['localhost', 'localhost.qz.io'],
  port: {
    secure: [8282, 8181, 8383, 8484],
    insecure: [8283, 8182, 8384, 8485],
  },
  keepAlive: 30,
  retries: 1,
  delay: 0.2,
};

export function isZplCompatiblePrinter(printerName: string) {
  return AUTO_MATCH.some((needle) => printerName.toLowerCase().includes(needle));
}

export function getSavedPrinter() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) || '';
}

export function savePreferredPrinter(printer: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, printer);
}

export function configureQzSecurity() {
  qz.security.setCertificatePromise(async () => process.env.NEXT_PUBLIC_QZ_TRAY_CERT || '');
  qz.security.setSignatureAlgorithm('SHA512');
  qz.security.setSignaturePromise(async (toSign: string) => {
    if (!process.env.NEXT_PUBLIC_QZ_TRAY_SIGNATURE_ENDPOINT) {
      return '';
    }

    const response = await fetch(process.env.NEXT_PUBLIC_QZ_TRAY_SIGNATURE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: toSign }),
      credentials: 'include',
    });

    const data = await response.json().catch(() => null) as { signature?: string } | null;
    return data?.signature || '';
  });
}

export async function ensureQzConnected() {
  if (!qz.websocket.isActive()) {
    await qz.websocket.connect(QZ_CONNECT_OPTIONS);
  }
}

async function reconnectQz() {
  if (qz.websocket.isActive()) {
    await qz.websocket.disconnect().catch(() => undefined);
  }
  await qz.websocket.connect(QZ_CONNECT_OPTIONS);
}

async function listWindowsPrintersFallback() {
  if (typeof window === 'undefined') return [];

  try {
    const response = await fetch('/api/etiquetas/local-printers', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json().catch(() => null) as { printers?: string[] } | null;
    return Array.isArray(data?.printers) ? data!.printers.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function listLocalPrinters() {
  await ensureQzConnected();
  let encontrados = await qz.printers.find().catch(() => []);
  const printersFromFind = Array.isArray(encontrados)
    ? encontrados
    : typeof encontrados === 'string' && encontrados.trim()
      ? [encontrados]
      : [];

  let printers = printersFromFind;

  if (printers.length === 0) {
    const currentPort = typeof qz.websocket.getConnectionInfo === 'function'
      ? qz.websocket.getConnectionInfo()?.port
      : undefined;

    if (currentPort === 8181 || currentPort === 8182 || typeof currentPort === 'undefined') {
      await reconnectQz().catch(() => undefined);
      encontrados = await qz.printers.find().catch(() => []);
      printers = Array.isArray(encontrados)
        ? encontrados
        : typeof encontrados === 'string' && encontrados.trim()
          ? [encontrados]
          : [];
    }
  }

  if (printers.length === 0 && typeof qz.printers.details === 'function') {
    const details = await qz.printers.details().catch(() => []);
    const detailsArray = Array.isArray(details) ? details : details ? [details] : [];
    printers = detailsArray
      .map((item) => (typeof item?.name === 'string' ? item.name.trim() : ''))
      .filter(Boolean);
  }

  if (printers.length === 0 && typeof qz.printers.getDefault === 'function') {
    const defaultPrinter = await qz.printers.getDefault().catch(() => '');
    if (defaultPrinter && defaultPrinter.trim()) {
      printers = [defaultPrinter.trim()];
    }
  }

  let source: 'qz' | 'windows' = 'qz';
  if (printers.length === 0) {
    const fallback = await listWindowsPrintersFallback();
    if (fallback.length > 0) {
      printers = fallback;
      source = 'windows';
    }
  }

  printers = Array.from(new Set(printers.filter((printer) => typeof printer === 'string' && printer.trim())));

  const savedPrinter = getSavedPrinter();
  const autoPrinter = printers.find((printer: string) => isZplCompatiblePrinter(printer));

  return {
    printers,
    suggestedPrinter: savedPrinter || autoPrinter || '',
    source,
  };
}

export async function printRawZpl(printerName: string, zpl: string) {
  await ensureQzConnected();
  const config = qz.configs.create(printerName);
  await qz.print(config, [{
    type: 'raw',
    format: 'command',
    flavor: 'plain',
    data: zpl,
  }]);
}

function parseQzError(error: unknown): QzStatus {
  const message = error instanceof Error ? error.message : 'Falha ao conectar com o QZ Tray.';
  const normalized = message.toLowerCase();

  if (
    normalized.includes('refused') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('websocket closed') ||
    normalized.includes('unable to establish') ||
    normalized.includes('cannot connect')
  ) {
    return {
      code: 'not_installed',
      message: 'QZ Tray nao foi encontrado neste computador. Baixe, instale e mantenha o aplicativo aberto para continuar.',
    };
  }

  if (
    normalized.includes('certificate') ||
    normalized.includes('sign') ||
    normalized.includes('blocked') ||
    normalized.includes('unauthorized')
  ) {
    return {
      code: 'authorization_required',
      message: 'O QZ Tray esta instalado, mas ainda precisa de autorizacao ou certificado para este site.',
    };
  }

  return {
    code: 'error',
    message,
  };
}

export async function detectQzStatus(): Promise<QzStatus> {
  try {
    await ensureQzConnected();
    return {
      code: 'connected',
      message: 'QZ Tray conectado com sucesso.',
    };
  } catch (error) {
    return parseQzError(error);
  }
}
