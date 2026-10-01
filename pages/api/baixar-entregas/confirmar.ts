import type { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

const CONFIRMATION_PREFIX = 'entrega_confirmacao:';
const SUPERVISOR_ROLES = new Set(['ADMIN', 'GERENTE']);
const MAX_PHOTO_LENGTH = 7_000_000;

const normalizeName = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

const normalizeNota = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.replace(/^0+/, '') || '0';
};

const confirmationKey = (controleId: string, numeroNota: string) =>
  `${CONFIRMATION_PREFIX}${controleId}:${normalizeNota(numeroNota)}`;

const getAuthenticatedUser = async (req: AuthenticatedRequest) => {
  return prisma.usuario.findUnique({
    where: { id: req.user.id },
    select: { id: true, nome: true, email: true, tipo: true, ativo: true },
  });
};

const assertControleAccess = async (
  controleId: string,
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
) => {
  const controle = await prisma.controleCarga.findUnique({
    where: { id: controleId },
    include: { notas: true },
  });

  if (!controle || !controle.finalizado) {
    return { error: 'Controle finalizado não encontrado', status: 404 } as const;
  }

  const isSupervisor = SUPERVISOR_ROLES.has(user.tipo);
  if (!isSupervisor && normalizeName(controle.motorista) !== normalizeName(user.nome)) {
    return { error: 'Este controle não está atribuído ao motorista logado', status: 403 } as const;
  }

  return { controle, isSupervisor } as const;
};

const serializeConfirmation = (row: any) => ({
  id: Number(row.id || 0),
  numeroNota: String(row.numeroNota || ''),
  controleId: String(row.controleId || ''),
  entregue: Boolean(row.entregue),
  dataConfirmacao: row.dataConfirmacao ? new Date(row.dataConfirmacao).toISOString() : null,
  confirmadoPor: row.confirmadoPor ? String(row.confirmadoPor) : null,
  recebedor: row.recebedor ? String(row.recebedor) : null,
  volumesConferidos: row.volumesConferidos === null ? null : Number(row.volumesConferidos),
  fotoComprovante: row.fotoComprovante ? String(row.fotoComprovante) : null,
  observacao: row.observacao ? String(row.observacao) : null,
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.ativo) {
      return res.status(401).json({ message: 'Usuário não autenticado ou inativo' });
    }

    if (req.method === 'GET') {
      const controleId = String(req.query.controleId || '').trim();
      if (!controleId) {
        return res.status(400).json({ message: 'controleId é obrigatório' });
      }

      const access = await assertControleAccess(controleId, user);
      if ('error' in access) {
        return res.status(access.status || 403).json({ message: access.error });
      }

      const numeroNota = String(req.query.numeroNota || '').trim();
      const rows = await prisma.configuracaoSistema.findMany({
        where: numeroNota
          ? { chave: confirmationKey(controleId, numeroNota) }
          : { chave: { startsWith: `${CONFIRMATION_PREFIX}${controleId}:` } },
        select: { valor: true },
        orderBy: { chave: 'asc' },
      });
      const confirmations = rows.flatMap((row) => {
        try {
          return [serializeConfirmation(JSON.parse(row.valor))];
        } catch {
          return [];
        }
      });

      return res.status(200).json(confirmations);
    }

    if (req.method === 'POST') {
      const {
        numeroNota,
        controleId,
        recebedor,
        volumesConferidos,
        fotoComprovante,
        observacao,
      } = req.body || {};

      const cleanNumeroNota = String(numeroNota || '').trim();
      const cleanControleId = String(controleId || '').trim();
      const cleanRecebedor = String(recebedor || '').trim();
      const volumes = Number(volumesConferidos);
      const photo = String(fotoComprovante || '');

      if (!cleanNumeroNota || !cleanControleId) {
        return res.status(400).json({ message: 'Nota e controle são obrigatórios' });
      }
      if (cleanRecebedor.length < 3 || cleanRecebedor.length > 120) {
        return res.status(400).json({ message: 'Informe o nome completo de quem recebeu' });
      }
      if (!Number.isInteger(volumes) || volumes < 1 || volumes > 100_000) {
        return res.status(400).json({ message: 'Informe uma quantidade de volumes válida' });
      }
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(photo)) {
        return res.status(400).json({ message: 'Tire ou selecione uma foto válida da entrega' });
      }
      if (photo.length > MAX_PHOTO_LENGTH) {
        return res.status(413).json({ message: 'A foto é muito grande. Tire outra foto com menor resolução' });
      }

      const access = await assertControleAccess(cleanControleId, user);
      if ('error' in access) {
        return res.status(access.status || 403).json({ message: access.error });
      }

      const nota = access.controle.notas.find(
        (item) => String(item.numeroNota).trim() === cleanNumeroNota
      );
      if (!nota) {
        return res.status(404).json({ message: 'A nota não pertence a este controle' });
      }

      const confirmadoPor = user.nome || user.email;
      const confirmation = {
        id: 0,
        numeroNota: cleanNumeroNota,
        controleId: cleanControleId,
        entregue: true,
        dataConfirmacao: new Date().toISOString(),
        confirmadoPor,
        recebedor: cleanRecebedor,
        volumesConferidos: volumes,
        fotoComprovante: photo,
        observacao: String(observacao || '').trim() || null,
      };
      const chave = confirmationKey(cleanControleId, cleanNumeroNota);
      await prisma.configuracaoSistema.upsert({
        where: { chave },
        create: {
          chave,
          valor: JSON.stringify(confirmation),
          descricao: 'Comprovante de entrega de nota fiscal',
          tipo: 'json',
          editavel: false,
        },
        update: { valor: JSON.stringify(confirmation) },
      });

      return res.status(200).json({
        success: true,
        message: 'Entrega finalizada com sucesso',
        confirmacao: serializeConfirmation(confirmation),
      });
    }

    return res.status(405).json({ message: 'Método não permitido' });
  } catch (error: any) {
    console.error('[Baixar Entregas] Erro ao confirmar entrega:', error);
    return res.status(500).json({
      message: 'Erro ao finalizar entrega',
      details: error?.message || 'Erro interno',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

export default withAuth(handler);
