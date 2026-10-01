import { apiExternaService } from '@/services/api-externa';

type Logistica = Awaited<ReturnType<typeof apiExternaService.buscarPedidoLogistica>>;
const cache = new Map<string, { expira: number; dados: Logistica }>();
const emAndamento = new Map<string, Promise<Logistica>>();

export async function buscarLogisticaAtual(pedidoId: number | string, username: string, password: string) {
  const chave = `${username}:${pedidoId}`;
  const salvo = cache.get(chave);
  if (salvo && salvo.expira > Date.now()) return salvo.dados;
  const pendente = emAndamento.get(chave);
  if (pendente) return pendente;
  const consulta = apiExternaService.buscarPedidoLogistica(pedidoId, username, password, 20_000)
    .then((dados) => {
      if (cache.size >= 1500) cache.delete(cache.keys().next().value!);
      cache.set(chave, { dados, expira: Date.now() + (dados ? 60_000 : 5_000) });
      return dados;
    }).finally(() => emAndamento.delete(chave));
  emAndamento.set(chave, consulta);
  return consulta;
}
