import { NextApiRequest, NextApiResponse } from 'next';
import { Transportadora } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🏷️ [Etiquetas] Iniciando handler de etiquetas');
  console.log('🏷️ [Etiquetas] Método:', req.method);
  console.log('🏷️ [Etiquetas] Headers de cookies:', req.headers.cookie ? 'Presentes' : 'Ausentes');

  const token = getTokenFromCookies(req);

  if (!token) {
    console.log('❌ [Etiquetas] Token não fornecido');
    console.log('❌ [Etiquetas] Cookies disponíveis:', req.headers.cookie);
    return res.status(401).json({ 
      error: 'Sessão expirada. Por favor, faça login novamente.',
      code: 'NO_TOKEN'
    });
  }

  const secret = process.env.JWT_SECRET || 'seu_segredo_secreto';
  const decoded = await verifyToken(token, secret);
  
  if (!decoded) {
    console.log('❌ [Etiquetas] Token inválido ou expirado');
    return res.status(401).json({ 
      error: 'Sessão expirada. Por favor, faça login novamente.',
      code: 'INVALID_TOKEN'
    });
  }

  if (!decoded.id) {
    console.log('❌ [Etiquetas] Token não contém ID do usuário');
    return res.status(401).json({ 
      error: 'Sessão inválida. Por favor, faça login novamente.',
      code: 'NO_USER_ID'
    });
  }

  console.log('✅ [Etiquetas] Usuário autenticado:', decoded.id);

  switch (req.method) {
    case 'GET': {
      try {
        // Buscar lotes de etiquetas do usuário
        const lotes = await prisma.etiquetaLote.findMany({
          where: {
            criadoPor: decoded.id
          },
          orderBy: { dataCriacao: 'desc' },
          include: {
            volumesEtiquetas: {
              orderBy: { indiceVolume: 'asc' }
            },
            criadoPorUser: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        });

        res.status(200).json(lotes);
      } catch (error) {
        console.error('Erro ao buscar lotes de etiquetas:', error);
        res.status(500).json({ error: 'Erro ao buscar lotes de etiquetas' });
      }
      break;
    }

    case 'POST': {
      try {
        console.log('📦 [Etiquetas] Recebendo requisição POST');
        console.log('📦 [Etiquetas] Usuário autenticado:', decoded);
        console.log('📦 [Etiquetas] Body da requisição:', req.body);

        const {
          codigoBarras,
          numeroNota,
          cliente,
          transportadora,
          numeroPedido,
          volumes,
          observacoes
        } = req.body;

        // Validações
        const camposObrigatorios = [];
        // codigoBarras é opcional - pode ser preenchido manualmente
        if (!numeroNota?.trim()) camposObrigatorios.push('numeroNota');
        if (!cliente?.trim()) camposObrigatorios.push('cliente');
        if (!transportadora) camposObrigatorios.push('transportadora');
        if (!numeroPedido?.trim()) camposObrigatorios.push('numeroPedido');
        if (!volumes || volumes < 1) camposObrigatorios.push('volumes');

        if (camposObrigatorios.length > 0) {
          return res.status(400).json({
            error: 'Campos obrigatórios não fornecidos',
            requiredFields: camposObrigatorios
          });
        }

        // Validar transportadora
        const transportadorasValidas = [
          'ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA',
          'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE'
        ];

        if (!transportadorasValidas.includes(transportadora)) {
          return res.status(400).json({
            error: 'Transportadora inválida',
            transportadorasValidas
          });
        }

        // Criar lote de etiquetas
        console.log('📦 [Etiquetas] Criando lote com dados:', {
          codigoBarras: codigoBarras?.trim() || '',
          numeroNota: numeroNota.trim(),
          cliente: cliente.trim(),
          transportadora,
          numeroPedido: numeroPedido.trim(),
          volumes: parseInt(volumes),
          observacoes: observacoes?.trim() || null,
          criadoPor: decoded.id
        });

        const lote = await prisma.etiquetaLote.create({
          data: {
            codigoBarras: codigoBarras?.trim() || '',
            numeroNota: numeroNota.trim(),
            cliente: cliente.trim(),
            transportadora: transportadora as Transportadora,
            numeroPedido: numeroPedido.trim(),
            volumes: parseInt(volumes),
            observacoes: observacoes?.trim() || null,
            criadoPor: decoded.id
          }
        });

        console.log('✅ [Etiquetas] Lote criado:', lote.id);

        // Criar volumes individuais
        const volumesData = [];
        for (let i = 1; i <= lote.volumes; i++) {
          // Gerar código único para o volume (baseado no lote + índice)
          const codigoVolume = `${lote.id}-${i.toString().padStart(3, '0')}`;

          volumesData.push({
            loteId: lote.id,
            indiceVolume: i,
            totalVolumes: lote.volumes,
            codigoVolume
          });
        }

        await prisma.etiquetaVolume.createMany({
          data: volumesData
        });

        // Buscar lote completo com volumes
        const loteCompleto = await prisma.etiquetaLote.findUnique({
          where: { id: lote.id },
          include: {
            volumesEtiquetas: {
              orderBy: { indiceVolume: 'asc' }
            },
            criadoPorUser: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        });

        res.status(201).json(loteCompleto);
      } catch (error: any) {
        console.error('💥 [Etiquetas] Erro ao criar lote:', error);
        console.error('💥 [Etiquetas] Stack:', error.stack);
        console.error('💥 [Etiquetas] Código do erro:', error.code);
        console.error('💥 [Etiquetas] Meta:', error.meta);

        // Tratamento de erros específicos do Prisma
        if (error.code === 'P2002') {
          const field = error.meta?.target?.[0] || 'campo';
          return res.status(400).json({
            error: `Já existe um registro com este ${field}`,
            field,
            code: 'DUPLICATE_ENTRY'
          });
        }

        if (error.code === 'P2003') {
          return res.status(400).json({
            error: 'Erro de referência: Usuário não encontrado',
            details: 'O usuário que está criando a etiqueta não existe no banco de dados',
            code: 'FOREIGN_KEY_CONSTRAINT'
          });
        }

        res.status(500).json({
          error: 'Erro ao criar lote de etiquetas',
          details: error.message,
          code: error.code
        });
      }
      break;
    }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
