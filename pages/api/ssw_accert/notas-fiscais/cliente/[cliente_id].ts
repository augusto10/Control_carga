import { NextApiRequest, NextApiResponse } from 'next';
import { trackingDanfe } from '@/services/sswClient';

const SANTRI_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SANTRI_API_USERNAME = process.env.API_SANTRI_USERNAME || 'erp@santri.com.br';
const SANTRI_API_PASSWORD = process.env.API_SANTRI_PASSWORD || 'PASSkey@2025';

type SantriNotaFiscal = {
  IDENTIFICACAO_NFE?: string;
  DATA_HORA_PROTOCOLO_NFE?: string;
  DATA_EMISSAO?: string;
  [key: string]: unknown;
};

type SantriNotasFiscaisResponse = {
  total?: number;
  limit?: number;
  offset?: number;
  data?: SantriNotaFiscal[];
  [key: string]: unknown;
};

type NotaFiscalComTracking = SantriNotaFiscal & {
  trackingDanfe?: unknown;
  trackingDanfeError?: string;
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function parseSantriDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function getSantriToken(): Promise<string> {
  const formData = new URLSearchParams();
  formData.append('username', SANTRI_API_USERNAME);
  formData.append('password', SANTRI_API_PASSWORD);

  const response = await fetch(`${SANTRI_API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    throw new Error('Falha na autenticação com a API Santri');
  }

  const data = (await response.json().catch(() => null)) as { access_token?: unknown } | null;
  const token = typeof data?.access_token === 'string' ? data.access_token : '';

  if (!token) {
    throw new Error('Token inválido retornado pela API Santri');
  }

  return token;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { cliente_id } = req.query;
    
    if (typeof cliente_id !== 'string') {
        return res.status(400).json({ error: 'cliente_id inválido' });
    }

    const limitRaw = req.query.limit as string;
    const offsetRaw = req.query.offset as string;

    const limit = Math.min(100, Math.max(1, Number(limitRaw ?? 50) || 50));
    const offset = Math.max(0, Number(offsetRaw ?? 0) || 0);

    const daysRaw = req.query.days as string;
    const parsedDays = Number(daysRaw ?? 30);
    const days = Math.min(365, Math.max(1, Number.isFinite(parsedDays) ? Math.trunc(parsedDays) : 30));

    const includeTrackingRaw = req.query.include_tracking as string;
    const includeTracking = includeTrackingRaw !== 'false';

    if (!cliente_id || Number.isNaN(Number(cliente_id))) {
      return res.status(400).json({ error: 'cliente_id inválido' });
    }

    const token = await getSantriToken();

    const now = new Date();
    const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const filtered: SantriNotaFiscal[] = [];
    let santriOffset = 0;
    const pageSize = 100;
    const maxPages = 10;

    for (let page = 0; page < maxPages; page += 1) {
      const url = new URL(`${SANTRI_API_BASE_URL}/api/v1/notas-fiscais/cliente/${cliente_id}`);
      url.searchParams.set('limit', String(pageSize));
      url.searchParams.set('offset', String(santriOffset));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data: SantriNotasFiscaisResponse | null = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof (data as { detail?: unknown } | null)?.detail === 'string'
            ? (data as { detail: string }).detail
            : 'Falha ao buscar notas fiscais';
        return res.status(response.status).json({ error: message });
      }

      const pageItems = Array.isArray(data?.data) ? data!.data! : [];
      if (!pageItems.length) break;

      let oldestDateInPage: Date | null = null;

      for (const nota of pageItems) {
        const date = parseSantriDate(nota.DATA_HORA_PROTOCOLO_NFE) ?? parseSantriDate(nota.DATA_EMISSAO);

        if (!date) continue;
        if (!oldestDateInPage || date < oldestDateInPage) oldestDateInPage = date;
        if (date >= fromDate) filtered.push(nota);
      }

      // Se a página inteira já está fora da janela de 30 dias, paramos.
      if (oldestDateInPage && oldestDateInPage < fromDate) {
        break;
      }

      // Se já temos material suficiente para a paginação final, paramos.
      if (filtered.length >= offset + limit) break;

      santriOffset += pageSize;
    }

    // Ordena por data (mais recente primeiro)
    filtered.sort((a, b) => {
      const da = parseSantriDate(a.DATA_HORA_PROTOCOLO_NFE) ?? parseSantriDate(a.DATA_EMISSAO);
      const db = parseSantriDate(b.DATA_HORA_PROTOCOLO_NFE) ?? parseSantriDate(b.DATA_EMISSAO);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return db.getTime() - da.getTime();
    });

    const windowed = filtered.slice(offset, offset + limit);

    let dataWithTracking: NotaFiscalComTracking[] = windowed;
    if (includeTracking) {
      dataWithTracking = await mapWithConcurrency(windowed, 3, async (nota) => {
        const chave = onlyDigits(typeof nota.IDENTIFICACAO_NFE === 'string' ? nota.IDENTIFICACAO_NFE : '');
        if (!chave || chave.length !== 44) {
          return { ...nota, trackingDanfeError: 'Chave NF-e inválida' };
        }

        try {
          const tracking = await trackingDanfe(chave);
          return { ...nota, trackingDanfe: tracking };
        } catch (e) {
          return {
            ...nota,
            trackingDanfeError: e instanceof Error ? e.message : 'Erro ao consultar tracking DANFE',
          };
        }
      });
    }

    return res.status(200).json({
      total: filtered.length,
      limit,
      offset,
      fromDays: days,
      include_tracking: includeTracking,
      data: dataWithTracking,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao buscar notas fiscais' });
  }
}
