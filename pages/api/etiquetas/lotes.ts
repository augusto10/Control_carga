import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, TipoUsuario, Transportadora } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { TransportLabelInput } from '@/types/labels';
import {
  gerarCodigosVolumes,
  sanitizeNumeroPedido,
  TRANSPORTADORA_PADRAO,
  TRANSPORTADORAS_VALIDAS,
  validateTransportLabelInput,
} from '@/lib/etiquetas-transporte';
import { criarLoteRepo, limparLotesAntigosRepo, listarLotesRepo } from '@/lib/etiquetas-repo';

const ALLOWED_ROLES: TipoUsuario[] = ['ADMIN', 'GERENTE', 'USUARIO', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'FUNCIONARIO'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getAuthenticatedUser(req);

  if (!user || !user.ativo) {
    return res.status(401).json({ message: 'Nao autorizado.' });
  }

  if (!ALLOWED_ROLES.includes(user.tipo)) {
    return res.status(403).json({ message: 'Voce nao tem permissao para acessar etiquetas de transporte.' });
  }

  if (req.method === 'POST') {
    return createLote(req, res, user.id);
  }

  if (req.method === 'GET') {
    return listLotes(req, res);
  }

  return res.status(405).json({ message: 'Metodo nao permitido.' });
}

async function createLote(req: NextApiRequest, res: NextApiResponse, criadoPor: string) {
  try {
    await limparLotesAntigosRepo();

    const body = (req.body || {}) as TransportLabelInput;
    const numeroPedido = sanitizeNumeroPedido(body.numeroPedido || '');
    const volumes = Number(body.volumes);

    const validation = validateTransportLabelInput({ numeroPedido, volumes });
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const transportadoraRaw = String(body.transportadora || '').trim();
    const transportadora = (
      (TRANSPORTADORAS_VALIDAS as readonly string[]).includes(transportadoraRaw)
        ? transportadoraRaw
        : TRANSPORTADORA_PADRAO
    ) as Transportadora;

    // Garante codigos de volume unicos mesmo quando o pedido ja foi impresso antes.
    const existing = await prisma.etiquetaVolume.findMany({
      where: { codigoVolume: { startsWith: `ETQ-${numeroPedido}-` } },
      select: { codigoVolume: true },
    });
    const codigos = gerarCodigosVolumes(numeroPedido, volumes, existing.map((item) => item.codigoVolume));

    // Usa o repositorio com SQL explicito: a coluna cnpj pode nao existir no
    // banco (migration pendente) e o Prisma falharia com P2022 nesse caso.
    const lote = await criarLoteRepo({
      codigoBarras: sanitizeNumeroPedido(body.codigoBarras || ''),
      numeroNota: String(body.numeroNota || '').trim().slice(0, 40),
      cliente: String(body.cliente || 'NAO INFORMADO').trim().slice(0, 120),
      cnpj: body.cnpj ? String(body.cnpj).trim().slice(0, 18) : null,
      transportadora,
      numeroPedido,
      volumes,
      observacoes: body.observacoes ? String(body.observacoes).trim().slice(0, 500) : null,
      criadoPor,
      codigosVolumes: codigos,
    });

    return res.status(201).json(lote);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ message: 'Ja existe um volume com esse codigo de barras. Tente novamente.' });
    }
    console.error('[etiquetas/lotes] Erro ao criar lote:', error);
    return res.status(500).json({ message: 'Erro interno ao criar o lote de etiquetas.' });
  }
}

async function listLotes(req: NextApiRequest, res: NextApiResponse) {
  try {
    await limparLotesAntigosRepo();

    const { numeroPedido, limite } = req.query;

    const take = Math.min(Math.max(Number(limite) || 20, 1), 100);

    const lotes = await listarLotesRepo({
      numeroPedido: numeroPedido && String(numeroPedido).trim()
        ? sanitizeNumeroPedido(String(numeroPedido))
        : undefined,
      limite: take,
    });

    return res.status(200).json(lotes);
  } catch (error) {
    console.error('[etiquetas/lotes] Erro ao listar lotes:', error);
    return res.status(500).json({ message: 'Erro interno ao listar os lotes.' });
  }
}
