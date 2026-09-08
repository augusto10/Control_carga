import { useEffect, useRef, useState } from 'react';
import { dadosPedido } from '@/lib/pedido-apresentacao';

type Informacoes = ReturnType<typeof dadosPedido>;
type Pedido = Partial<Informacoes> & { pedidoId: number; usuarioConfirmacaoNome?: string | null };
type Detalhe = Parameters<typeof dadosPedido>;
type CarregarDetalhe = (id: number) => Promise<{ pedido: NonNullable<Detalhe[0]>; logistica: Detalhe[1] }>;

// Limita as consultas ao ERP quando varios pedidos entram na area visivel.
let consultasAtivas = 0;
const fila: Array<() => Promise<void>> = [];
function processarFila() {
  while (consultasAtivas < 4 && fila.length) {
    const tarefa = fila.shift()!;
    consultasAtivas += 1;
    void tarefa().finally(() => {
      consultasAtivas -= 1;
      processarFila();
    });
  }
}

export function PedidoInformacoes({ pedido, carregarDetalhe }: { pedido: Pedido; carregarDetalhe: CarregarDetalhe }) {
  const elemento = useRef<HTMLDivElement>(null);
  const [informacoes, setInformacoes] = useState<Informacoes | null>(null);
  const [situacao, setSituacao] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  useEffect(() => {
    let cancelado = false;
    let agendado = false;
    setInformacoes(null);
    setSituacao('carregando');
    const carregar = () => {
      if (agendado) return;
      agendado = true;
      fila.push(async () => {
        if (cancelado) return;
        try {
          const detalhe = await carregarDetalhe(pedido.pedidoId);
          if (!cancelado) {
            setInformacoes(dadosPedido(detalhe.pedido, detalhe.logistica));
            setSituacao('pronto');
          }
        } catch {
          if (!cancelado) setSituacao('erro');
        }
      });
      processarFila();
    };
    const observador = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entradas) => {
      if (entradas.some((entrada) => entrada.isIntersecting)) {
        carregar();
        observador?.disconnect();
      }
    }, { rootMargin: '150px' });
    if (observador && elemento.current) observador.observe(elemento.current);
    else carregar();
    return () => { cancelado = true; observador?.disconnect(); };
  }, [pedido.pedidoId, carregarDetalhe]);

  const ausente = situacao === 'carregando' ? 'Carregando...' : situacao === 'erro' ? 'Indisponível' : 'Não informado';
  const valor = (campo: keyof Informacoes) => informacoes?.[campo] || pedido[campo] || (campo === 'conferenteNome' ? pedido.usuarioConfirmacaoNome : null) || ausente;

  return (
    <div ref={elemento} className="mt-2 grid gap-1 text-xs text-slate-600">
      <p>Cidade / UF: <strong>{valor('cidade')} / {valor('uf')}</strong></p>
      <p>Bairro: <strong>{valor('bairro')}</strong></p>
      <p>Separador: <strong>{valor('separadorNome')}</strong></p>
      <p>Conferente: <strong>{valor('conferenteNome')}</strong></p>
    </div>
  );
}
