import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';

const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const normalizeNota = (value: unknown) => onlyDigits(value).replace(/^0+/, '') || '0';

const pick = (...values: unknown[]) => {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '') return value;
  }
  return null;
};

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

  const numerosProcurados = new Set(controle.notas.map((nota) => normalizeNota(nota.numeroNota)));
  const completasPorNumero = new Map<string, Record<string, unknown>>();
  const limit = 500;

  for (let offset = 0; offset < 5000; offset += limit) {
    const resultado = await apiExternaService.listarNotasFiscaisCompletas(
      { limit, offset },
      username,
      password
    );
    const pagina = Array.isArray(resultado?.data) ? resultado.data : [];
    if (pagina.length === 0) break;

    for (const item of pagina) {
      const notaFiscal =
        (item.nota_fiscal as Record<string, unknown> | undefined) ||
        (item.notaFiscal as Record<string, unknown> | undefined) ||
        {};
      const pedido =
        (item.pedido as Record<string, unknown> | undefined) ||
        (item.pedido_venda as Record<string, unknown> | undefined) ||
        {};
      const numero = normalizeNota(
        pick(
          notaFiscal.NUMERO_NOTA,
          notaFiscal.NUMERO_NOTA_FISCAL,
          notaFiscal.numero,
          item.NUMERO_NOTA,
          item.NUMERO_NOTA_FISCAL
        )
      );

      if (numerosProcurados.has(numero)) {
        completasPorNumero.set(numero, { ...item, ...pedido, ...notaFiscal });
      }
    }

    if (completasPorNumero.size >= numerosProcurados.size) break;
    if (pagina.length < limit) break;
    if (typeof resultado?.total === 'number' && resultado.total > 0 && offset + pagina.length >= resultado.total) break;
  }

  const notas = await Promise.all(
    controle.notas.map(async (nota) => {
      try {
        const chave = onlyDigits(nota.codigo);
        const completa = completasPorNumero.get(normalizeNota(nota.numeroNota));
        const externa = completa || (chave.length === 44
          ? await apiExternaService.buscarNotaFiscalPorChave(chave, username, password)
          : await apiExternaService.buscarNotaFiscalPorNumeroSerie(nota.numeroNota, '1', username, password));

        const dados = (externa || {}) as Record<string, unknown>;
        return {
          ...nota,
          _pdfEnriquecida: true,
          valorPedido: pick(dados.valorPedido, dados.valor, dados.VALOR_TOTAL_NOTA, dados.VALOR_TOTAL, dados.TOTAL),
          pesoBruto: pick(dados.pesoBruto, dados.peso, dados.PESO_BRUTO, dados.PESO_TOTAL, dados.TOTAL_PESO),
          razaoSocial: pick(dados.razaoSocial, dados.NOME_RAZAO_SOCIAL, dados.NOME_FANTASIA),
          dataEmissao: pick(dados.dataEmissao, dados.DATA_EMISSAO, dados.DATA_HORA_EMISSAO),
          cnpj: pick(dados.cnpj, dados.CNPJ, dados.CNPJ_CPF, dados.CNPJ_DESTINATARIO),
          volumes: String(pick(nota.volumes, dados.volumes, dados.VOLUMES) ?? '1'),
        };
      } catch (error) {
        console.error(`[PDF Controle] Falha ao completar NF ${nota.numeroNota}:`, error);
        return { ...nota, _pdfEnriquecida: true };
      }
    })
  );

  return res.status(200).json({ ...controle, notas });
}
