/**
 * Repositorio de persistencia dos lotes de etiquetas de transporte.
 *
 * MOTIVO: a migration `20260807150000_add_cnpj_etiqueta_lote` (coluna
 * `EtiquetaLote.cnpj`) ainda pode nao estar aplicada no banco de producao.
 * Nesse caso, qualquer consulta do Prisma ao modelo `EtiquetaLote` falha com
 * P2022 (coluna inexistente), pois o client sempre referencia todas as
 * colunas do schema.
 *
 * Para nao bloquear a geracao/impressao das etiquetas, este repositorio usa
 * SQL explicito com lista de colunas dinamica: inclui `cnpj` apenas quando a
 * coluna existir no banco. Quando a migration for aplicada, o `cnpj` passa a
 * ser gravado automaticamente, sem mudanca de codigo.
 */
import { randomUUID } from 'crypto';
import { Transportadora } from '@prisma/client';
import prisma from '@/lib/prisma';
import { EtiquetaLoteData, EtiquetaVolumeData } from '@/types/labels';

const COLUNAS_LOTE_BASE = [
  '"id"',
  '"dataCriacao"',
  '"codigoBarras"',
  '"numeroNota"',
  '"cliente"',
  '"transportadora"',
  '"numeroPedido"',
  '"volumes"',
  '"observacoes"',
  '"criadoPor"',
] as const;

const COLUNAS_VOLUME = [
  '"id"',
  '"loteId"',
  '"indiceVolume"',
  '"totalVolumes"',
  '"codigoVolume"',
  '"impressoEm"',
] as const;

// Cache da presenca da coluna cnpj (1 consulta por instancia do servidor).
let colunaCnpjPromise: Promise<boolean> | null = null;

function inicioDoDiaAtualBrasil(): Date {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(agora);

  const ano = partes.find((item) => item.type === 'year')?.value ?? '1970';
  const mes = partes.find((item) => item.type === 'month')?.value ?? '01';
  const dia = partes.find((item) => item.type === 'day')?.value ?? '01';

  return new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`);
}

function verificarColunaCnpj(): Promise<boolean> {
  if (!colunaCnpjPromise) {
    colunaCnpjPromise = prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'EtiquetaLote' AND column_name = 'cnpj'
      LIMIT 1
    `
      .then((rows) => rows.length > 0)
      .catch(() => false);
  }
  return colunaCnpjPromise;
}

export function resetarCacheColunaCnpj(): void {
  colunaCnpjPromise = null;
}

async function colunasLote(): Promise<string[]> {
  const comCnpj = await verificarColunaCnpj();
  return comCnpj ? [...COLUNAS_LOTE_BASE, '"cnpj"'] : [...COLUNAS_LOTE_BASE];
}

// ─── Mapeamento de linhas → tipos da aplicacao ───────────────────────────

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
}

function mapearLote(row: Record<string, any>): EtiquetaLoteData {
  const nomeCriador = row.criadoPorNome ?? null;
  return {
    id: String(row.id ?? ''),
    dataCriacao: toIso(row.dataCriacao),
    codigoBarras: row.codigoBarras ?? '',
    numeroNota: row.numeroNota ?? '',
    cliente: row.cliente ?? '',
    cnpj: row.cnpj ?? null,
    transportadora: String(row.transportadora ?? ''),
    numeroPedido: String(row.numeroPedido ?? ''),
    volumes: Number(row.volumes ?? 0),
    observacoes: row.observacoes ?? null,
    criadoPor: String(row.criadoPor ?? ''),
    criadoPorNome: nomeCriador || undefined,
    criadoPorUser: nomeCriador ? { nome: nomeCriador } : null,
    volumesEtiquetas: [],
  };
}

function mapearVolume(row: Record<string, any>): EtiquetaVolumeData {
  return {
    id: String(row.id ?? ''),
    loteId: String(row.loteId ?? ''),
    indiceVolume: Number(row.indiceVolume ?? 0),
    totalVolumes: Number(row.totalVolumes ?? 0),
    codigoVolume: String(row.codigoVolume ?? ''),
    impressoEm: row.impressoEm ? toIso(row.impressoEm) : null,
  };
}

// ─── Volumes auxiliares ──────────────────────────────────────────────────

async function buscarVolumesDosLotes(ids: string[]): Promise<EtiquetaVolumeData[]> {
  if (ids.length === 0) return [];

  const lotes: EtiquetaVolumeData[] = [];
  // Executa em blocos para nao estourar o limite de parametros do Postgres.
  const TAMANHO_BLOCO = 200;
  for (let inicio = 0; inicio < ids.length; inicio += TAMANHO_BLOCO) {
    const bloco = ids.slice(inicio, inicio + TAMANHO_BLOCO);
    const placeholders = bloco.map((_, i) => `$${i + 1}`).join(', ');
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT ${COLUNAS_VOLUME.join(', ')}
       FROM "EtiquetaVolume"
       WHERE "loteId" IN (${placeholders})
       ORDER BY "loteId" ASC, "indiceVolume" ASC`,
      ...bloco
    )) as Record<string, any>[];
    lotes.push(...rows.map(mapearVolume));
  }
  return lotes;
}

function montarVolumes(loteId: string, totalVolumes: number, codigosVolumes: string[]) {
  const valores: unknown[] = [];
  const linhas: string[] = [];

  codigosVolumes.forEach((codigoVolume, index) => {
    const i = index * 5;
    valores.push(randomUUID(), loteId, index + 1, totalVolumes, codigoVolume);
    linhas.push(`($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5})`);
  });

  return { valores, linhas };
}

// ─── Operacoes do repositorio ────────────────────────────────────────────

export interface CriarLoteRepoInput {
  id?: string;
  codigoBarras: string;
  numeroNota: string;
  cliente: string;
  cnpj?: string | null;
  transportadora: Transportadora;
  numeroPedido: string;
  volumes: number;
  observacoes?: string | null;
  criadoPor: string;
  codigosVolumes: string[];
}

export async function criarLoteRepo(input: CriarLoteRepoInput): Promise<EtiquetaLoteData> {
  const colunas = await colunasLote();

  const colunasIniciais = ['"id"', '"codigoBarras"', '"numeroNota"', '"cliente"'];
  const valores: unknown[] = [
    input.id ?? randomUUID(),
    input.codigoBarras,
    input.numeroNota,
    input.cliente,
  ];

  if (colunas.includes('"cnpj"')) {
    colunasIniciais.push('"cnpj"');
    valores.push(input.cnpj ?? null);
  }

  colunasIniciais.push('"transportadora"', '"numeroPedido"', '"volumes"', '"observacoes"', '"criadoPor"');
  valores.push(input.transportadora, input.numeroPedido, input.volumes, input.observacoes ?? null, input.criadoPor);

  // Usa sempre a mesma lista do INSERT no RETURNING (evita referencia a cnpj quando ausente).
  const colsSql = colunasIniciais.join(', ');
  const placeholders = colunasIniciais
    .map((coluna, i) => (coluna === '"transportadora"' ? `$${i + 1}::"Transportadora"` : `$${i + 1}`))
    .join(', ');

  const linhasLote = (await prisma.$queryRawUnsafe(
    `INSERT INTO "EtiquetaLote" (${colsSql})
     VALUES (${placeholders})
     RETURNING ${colsSql}, "dataCriacao"`,
    ...valores
  )) as Record<string, any>[];

  const lote = mapearLote(linhasLote[0] || {});

  // Grava os volumes (em blocos, para nao estourar limites de parametros).
  const TAMANHO_BLOCO = 200;
  for (let inicio = 0; inicio < input.codigosVolumes.length; inicio += TAMANHO_BLOCO) {
    const codigos = input.codigosVolumes.slice(inicio, inicio + TAMANHO_BLOCO);
    const { valores: valoresVolumes, linhas: linhasVolumes } = montarVolumes(lote.id, input.volumes, codigos);
    const rowsVolumes = (await prisma.$queryRawUnsafe(
      `INSERT INTO "EtiquetaVolume" ("id", "loteId", "indiceVolume", "totalVolumes", "codigoVolume")
       VALUES ${linhasVolumes.join(', ')}
       RETURNING ${COLUNAS_VOLUME.join(', ')}`,
      ...valoresVolumes
    )) as Record<string, any>[];
    lote.volumesEtiquetas.push(...rowsVolumes.map(mapearVolume));
  }

  lote.volumesEtiquetas.sort((a, b) => a.indiceVolume - b.indiceVolume);
  return lote;
}

export async function buscarLoteRepo(id: string): Promise<EtiquetaLoteData | null> {
  const colunas = await colunasLote();
  const colsSql = colunas.join(', l.');

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT l.${colsSql}, u."nome" AS "criadoPorNome"
     FROM "EtiquetaLote" l
     LEFT JOIN "Usuario" u ON u."id" = l."criadoPor"
     WHERE l."id" = $1
     LIMIT 1`,
    id
  )) as Record<string, any>[];

  if (rows.length === 0) return null;

  const lote = mapearLote(rows[0]);
  lote.volumesEtiquetas = await buscarVolumesDosLotes([lote.id]);
  return lote;
}

export async function limparLotesAntigosRepo(): Promise<number> {
  const inicioHoje = inicioDoDiaAtualBrasil();
  const resultado = await prisma.etiquetaLote.deleteMany({
    where: {
      dataCriacao: {
        lt: inicioHoje,
      },
    },
  });

  return resultado.count;
}

export async function listarLotesRepo(params: {
  numeroPedido?: string;
  limite: number;
}): Promise<EtiquetaLoteData[]> {
  const colunas = await colunasLote();
  const colsSql = colunas.join(', l.');

  const temPedido = Boolean(params.numeroPedido);
  const inicioHoje = inicioDoDiaAtualBrasil();
  const whereParts = ['l."dataCriacao" >= $1'];
  const valores: unknown[] = [inicioHoje];

  if (temPedido) {
    whereParts.push(`l."numeroPedido" = $${valores.length + 1}`);
    valores.push(params.numeroPedido);
  }

  const whereSql = `WHERE ${whereParts.join(' AND ')}`;
  const indexLimite = valores.length + 1;
  valores.push(params.limite);

  const rows = (await prisma.$queryRawUnsafe(
    `SELECT l.${colsSql}, u."nome" AS "criadoPorNome"
     FROM "EtiquetaLote" l
     LEFT JOIN "Usuario" u ON u."id" = l."criadoPor"
     ${whereSql}
     ORDER BY l."dataCriacao" DESC
     LIMIT $${indexLimite}`,
    ...valores
  )) as Record<string, any>[];

  if (rows.length === 0) return [];

  const ids = rows.map((row) => String(row.id ?? ''));
  const volumes = await buscarVolumesDosLotes(ids);
  const volumesPorLote = new Map<string, EtiquetaVolumeData[]>();
  for (const volume of volumes) {
    const lista = volumesPorLote.get(volume.loteId) || [];
    lista.push(volume);
    volumesPorLote.set(volume.loteId, lista);
  }

  return rows.map((row) => {
    const lote = mapearLote(row);
    lote.volumesEtiquetas = volumesPorLote.get(lote.id) || [];
    return lote;
  });
}
