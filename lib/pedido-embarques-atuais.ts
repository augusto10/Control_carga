import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';

type ReferenciaPedido = { pedidoId: number; numeroNota?: string | null; chaveNfe?: string | null; dataHoraRecebimento?: Date | null };
export type ControleAtual = { numeroManifesto: string | null; transportadoraNome: string | null; dataHoraControle: Date | null };
type NotaReferencia = { pedidoId: number; numero: string; chave: string };
const digitos = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const numero = (value: unknown) => String(value ?? '').trim().replace(/^0+/, '');
const paginas = new Map<string, { expira: number; consulta: Promise<Awaited<ReturnType<typeof apiExternaService.listarNotasFiscaisCompletas>>> }>();

export async function buscarEmbarquesAtuais(pedidos: ReferenciaPedido[], username?: string, password?: string) {
  if (!pedidos.length) return { porPedido: new Map<number, ControleAtual>(), verificacaoIncompleta: false };
  const referencias: NotaReferencia[] = pedidos.map((pedido) => ({ pedidoId: pedido.pedidoId, numero: numero(pedido.numeroNota), chave: digitos(pedido.chaveNfe) }));
  const ids = new Set(pedidos.map((pedido) => pedido.pedidoId));
  const datas = pedidos.flatMap((pedido) => pedido.dataHoraRecebimento ? [pedido.dataHoraRecebimento.getTime()] : []);
  const inicio = datas.length ? Math.min(...datas) : Date.now() - 30 * 86400000;
  let verificacaoIncompleta = !username || !password;

  if (username && password) {
    // A primeira pagina nem sempre cobre o periodo dos pedidos atrasados.
    // O cache e so das referencias externas; os controles locais sao lidos a cada consulta.
    for (let pagina = 0; pagina < 6; pagina += 1) {
      const offset = pagina * 500;
      const chaveCache = `${username}:${offset}`;
      let salvo = paginas.get(chaveCache);
      if (!salvo || salvo.expira <= Date.now()) {
        salvo = { expira: Date.now() + 60_000, consulta: apiExternaService.listarNotasFiscaisCompletas({ limit: 500, offset }, username, password, 8_000) };
        paginas.set(chaveCache, salvo);
      }
      const resultado = await salvo.consulta;
      if (!resultado) { verificacaoIncompleta = true; break; }
      const datasNotas: number[] = [];
      for (const nota of resultado.data) {
        const id = Number(nota.PEDIDO_ID ?? nota.ORCAMENTO_ID ?? nota.ORCAMENTO_BASE_ID);
        if (ids.has(id)) referencias.push({ pedidoId: id, numero: numero(nota.NUMERO_NOTA), chave: digitos(nota.IDENTIFICACAO_NFE) });
        const data = new Date(String(nota.DATA_EMISSAO ?? '')).getTime();
        if (Number.isFinite(data)) datasNotas.push(data);
      }
      if (offset + resultado.data.length >= resultado.total || resultado.data.length === 0) break;
      // So encerra por data quando toda a pagina antecede os pedidos consultados.
      if (datasNotas.length === resultado.data.length && Math.max(...datasNotas) < inicio - 86400000) break;
      if (pagina === 5) verificacaoIncompleta = true;
    }
  }

  const chaves = [...new Set(referencias.filter((ref) => ref.chave.length === 44).map((ref) => ref.chave))];
  const numeros = [...new Set(referencias.filter((ref) => ref.numero).flatMap((ref) => [ref.numero, ref.numero.padStart(9, '0')]))];
  const porPedido = new Map<number, ControleAtual>();
  if (!chaves.length && !numeros.length) return { porPedido, verificacaoIncompleta };
  const notasLocais = await prisma.notaFiscal.findMany({
    where: { controleId: { not: null }, OR: [{ codigo: { in: chaves } }, { numeroNota: { in: numeros } }] },
    select: { numeroNota: true, codigo: true, dataCriacao: true, controle: { select: { numeroManifesto: true, transportadora: true, dataCriacao: true } } },
    orderBy: { dataCriacao: 'desc' },
  });
  const porChave = new Map<string, ControleAtual>();
  const porNumero = new Map<string, ControleAtual>();
  for (const nota of notasLocais) {
    const info = { numeroManifesto: nota.controle?.numeroManifesto || null, transportadoraNome: nota.controle?.transportadora ? String(nota.controle.transportadora) : null, dataHoraControle: nota.controle?.dataCriacao || nota.dataCriacao };
    if (!porChave.has(digitos(nota.codigo))) porChave.set(digitos(nota.codigo), info);
    if (!porNumero.has(numero(nota.numeroNota))) porNumero.set(numero(nota.numeroNota), info);
  }
  for (const referencia of referencias) {
    const controle = referencia.chave.length === 44 ? porChave.get(referencia.chave) : porNumero.get(referencia.numero);
    if (controle) porPedido.set(referencia.pedidoId, controle);
  }
  return { porPedido, verificacaoIncompleta };
}
