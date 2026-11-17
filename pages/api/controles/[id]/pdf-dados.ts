import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';
import { normalizarNotaPdf, temDadosCompletosNotaPdf } from '@/lib/controles/pdf-dados';

const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const normalizeNota = (value: unknown) => onlyDigits(value).replace(/^0+/, '') || '0';
const pick = (...values: unknown[]) => values.find((value) =>
  value !== null && value !== undefined && String(value).trim() !== ''
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : '';
  if (!id) return res.status(400).json({ message: 'ID do controle inválido' });

  const controle = await prisma.controleCarga.findUnique({
    where: { id },
    include: { notas: true },
  });
  if (!controle) return res.status(404).json({ message: 'Controle não encontrado' });

  const username = process.env.API_EXTERNA_USERNAME;
  const password = process.env.API_EXTERNA_PASSWORD;
  if (!username || !password || controle.notas.length === 0) {
    return res.status(200).json(controle);
  }

  const notasConsultadas = await Promise.all(
    controle.notas.map(async (nota) => {
      let externa = null;
      try {
        const chave = onlyDigits(nota.codigo);
        externa = chave.length === 44
          ? await apiExternaService.buscarNotaFiscalPorChave(chave, username, password)
          : await apiExternaService.buscarNotaFiscalPorNumeroSerie(nota.numeroNota, '1', username, password);

        let dados = normalizarNotaPdf(nota, externa);
        if (chave.length === 44 && !temDadosCompletosNotaPdf(dados) && nota.numeroNota) {
          const serie = String(Number(chave.slice(22, 25)));
          const porNumero = await apiExternaService.buscarNotaFiscalPorNumeroSerie(nota.numeroNota, serie, username, password);
          dados = normalizarNotaPdf(dados, porNumero);
          externa = porNumero ?? externa;
        }
        return { nota, externa, dados };
      } catch (error) {
        console.error(`[PDF Controle] Falha ao completar NF ${nota.numeroNota}:`, error);
        return { nota, externa, dados: normalizarNotaPdf(nota) };
      }
    })
  );

  const numerosPendentes = new Set(
    notasConsultadas
      .filter(({ dados }) => !temDadosCompletosNotaPdf(dados))
      .map(({ nota }) => normalizeNota(nota.numeroNota))
  );
  const completasPorNumero = new Map<string, Record<string, unknown>>();

  if (numerosPendentes.size > 0) {
    const limit = 500;
    for (let offset = 0; offset < 5000; offset += limit) {
      const resultado = await apiExternaService.listarNotasFiscaisCompletas(
        { limit, offset },
        username,
        password
      );
      const pagina = Array.isArray(resultado?.data) ? resultado.data : [];
      if (pagina.length === 0) break;

      for (const value of pagina) {
        const item = value as Record<string, unknown>;
        const notaFiscal = (item.nota_fiscal || item.notaFiscal || {}) as Record<string, unknown>;
        const pedido = (item.pedido || item.pedido_venda || {}) as Record<string, unknown>;
        const numero = normalizeNota(pick(
          notaFiscal.NUMERO_NOTA,
          notaFiscal.NUMERO_NOTA_FISCAL,
          notaFiscal.numero,
          item.NUMERO_NOTA,
          item.NUMERO_NOTA_FISCAL
        ));

        if (numerosPendentes.has(numero)) {
          completasPorNumero.set(numero, { ...item, ...pedido, ...notaFiscal });
        }
      }

      if (completasPorNumero.size >= numerosPendentes.size) break;
      if (pagina.length < limit) break;
      if (typeof resultado?.total === 'number' && resultado.total > 0 && offset + pagina.length >= resultado.total) break;
    }
  }

  const notas = notasConsultadas.map(({ nota, externa, dados }) => {
    const completa = completasPorNumero.get(normalizeNota(nota.numeroNota));
    const notaNormalizada = completa && !temDadosCompletosNotaPdf(dados)
      ? normalizarNotaPdf(dados, completa)
      : dados;
    const itens = externa?.itens ?? completa?.itens;
    return {
      ...notaNormalizada,
      produtos: Array.isArray(itens) ? itens.map((item) => ({
        produtoId: item.produtoId,
        codigo: item.codigo,
        nome: item.nome,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        unidade: item.unidade,
      })) : [],
    };
  });

  return res.status(200).json({ ...controle, notas });
}
