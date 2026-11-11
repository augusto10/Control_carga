import Head from 'next/head';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Fingerprint,
  PackageOpen,
  RefreshCw,
  Tablet,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/cn';

const POLLING_MS = 20_000;
// Tempo sem separar a partir do qual o pedido passa a realertar.
const ALERTA_PEDIDO_PARADO_MS = 5 * 60_000;
// Intervalo entre os realertas enquanto o pedido continua parado.
const ALERTA_RECORRENTE_MS = 5 * 60_000;
const AGENTE_BIOMETRIA_URL = 'http://127.0.0.1:17876';

// Página pública (totem): as APIs de separação autenticam pelo cookie
// httpOnly `totem_auth`, emitido uma única vez por GET /api/totem/auth?k=
// (pareamento do tablet). Ver `withTotemOrAuth`. Cookies same-origin são
// enviados automaticamente pelo fetch — não há token no bundle.
const fetchTotem = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, credentials: 'same-origin' });

type PedidoFila = {
  pedidoId: number;
  clienteNome: string | null;
  nomeFantasia: string | null;
  localNome: string | null;
  cidade: string | null;
  uf: string | null;
  valorPedido: number | null;
  dataHoraRecebimento: string | null;
  previsaoEntrega: string | null;
  regiaoRestrita: boolean;
  prioridade: boolean;
};

type SeparacaoAtiva = {
  id: string;
  pedidoId: number;
  dataAssociacao: string;
  usuario: { id: string; nome: string };
};

function formatarDataHora(value: string | null) {
  if (!value) return '-';
  const data = new Date(value);
  if (Number.isNaN(data.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data);
}

function tempoDecorrido(value: string, agora: number) {
  const diff = agora - new Date(value).getTime();
  const minutos = Math.max(0, Math.floor(diff / 60000));
  if (minutos < 60) return `${minutos}min`;
  const horas = Math.floor(minutos / 60);
  return `${horas}h${String(minutos % 60).padStart(2, '0')}`;
}

function formatarValor(value: number | null) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function SeparacaoContent() {
  const [fila, setFila] = useState<PedidoFila[]>([]);
  const [ativas, setAtivas] = useState<SeparacaoAtiva[]>([]);
  const [loading, setLoading] = useState(true);
  const [associando, setAssociando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [somAtivo, setSomAtivo] = useState(true);
  const [novoPedido, setNovoPedido] = useState(false);
  const [alertaParado, setAlertaParado] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const [marqueeAtivo, setMarqueeAtivo] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const ultimoPedidoRef = useRef<number | null>(null);
  const paradoDesdeRef = useRef<number | null>(null);
  const ultimoAlertaRef = useRef(0);
  const marqueeContainerRef = useRef<HTMLDivElement | null>(null);

  // AudioContext exige gesto do usuário: cria/resume no primeiro toque na tela
  useEffect(() => {
    const desbloquear = () => {
      if (!audioRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) audioRef.current = new Ctx();
      }
      void audioRef.current?.resume();
    };
    window.addEventListener('pointerdown', desbloquear);
    return () => window.removeEventListener('pointerdown', desbloquear);
  }, []);

  const tocarAlerta = useCallback(() => {
    const ctx = audioRef.current;
    if (!ctx) return;
    try {
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.35;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch {
      // Sem áudio disponível — alerta visual continua ativo
    }
  }, []);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const [resFila, resAtivas] = await Promise.all([
        fetchTotem('/api/separacao/fila'),
        fetchTotem('/api/separacao/ativas'),
      ]);
      if (resFila.status === 401 || resAtivas.status === 401) {
        throw new Error(
          'Totem não autorizado. Abra o link de pareamento (/api/totem/auth?k=…) neste tablet para liberar o acesso.'
        );
      }

      const [dataFila, dataAtivas] = await Promise.all([
        resFila.json(),
        resAtivas.json(),
      ]);

      if (!resFila.ok) throw new Error(dataFila.message || 'Falha ao carregar a fila.');
      if (!resAtivas.ok) throw new Error(dataAtivas.message || 'Falha ao carregar separações ativas.');

      setFila(dataFila.fila ?? []);
      setAtivas(dataAtivas.ativas ?? []);
      setErro(null);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Falha ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
    const intervalo = setInterval(() => void carregar(true), POLLING_MS);
    return () => clearInterval(intervalo);
  }, [carregar]);

  // Relógio para o tempo de separação em andamento
  useEffect(() => {
    const intervalo = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(intervalo);
  }, []);

  // Mensagem de confirmação some sozinha após alguns segundos
  useEffect(() => {
    if (!mensagem) return;
    const timeout = setTimeout(() => setMensagem(null), 8_000);
    return () => clearTimeout(timeout);
  }, [mensagem]);

  // Marquee só desliza quando a lista transborda a faixa — sem isso a
  // cópia duplicada (necessária pro loop) apareceria lado a lado.
  useEffect(() => {
    const el = marqueeContainerRef.current;
    if (!el) return;
    const verificar = () => {
      // Primeira cópia da lista = largura real do conteúdo (ignora a duplicação do loop)
      const trilha = el.firstElementChild as HTMLElement | null;
      const copia = trilha?.firstElementChild as HTMLElement | null;
      setMarqueeAtivo((copia?.offsetWidth ?? 0) > el.clientWidth + 8);
    };
    verificar();
    const observer = new ResizeObserver(verificar);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ativas, agora]);

  const proximo = fila[0] ?? null;

  // Alerta visual + sonoro quando o próximo pedido muda (ou surge em fila vazia)
  useEffect(() => {
    if (!proximo) {
      ultimoPedidoRef.current = null;
      paradoDesdeRef.current = null;
      return;
    }
    if (ultimoPedidoRef.current === proximo.pedidoId) return;
    ultimoPedidoRef.current = proximo.pedidoId;
    paradoDesdeRef.current =
      (proximo.dataHoraRecebimento && new Date(proximo.dataHoraRecebimento).getTime()) || Date.now();
    ultimoAlertaRef.current = Date.now();
    setAlertaParado(false);
    setNovoPedido(true);
    if (somAtivo) tocarAlerta();
    const timeout = setTimeout(() => setNovoPedido(false), 10_000);
    return () => clearTimeout(timeout);
  }, [proximo, somAtivo, tocarAlerta]);

  // Realerta enquanto o pedido seguir parado na fila (ninguém separou).
  useEffect(() => {
    const verificar = () => {
      if (!proximo || !somAtivo) return;
      const agoraTs = Date.now();
      const paradoDesde = paradoDesdeRef.current ?? agoraTs;
      const atrasado = agoraTs - paradoDesde >= ALERTA_PEDIDO_PARADO_MS;
      const repetir = agoraTs - ultimoAlertaRef.current >= ALERTA_RECORRENTE_MS;
      if (!atrasado || !repetir) return;
      ultimoAlertaRef.current = agoraTs;
      setAlertaParado(true);
      setNovoPedido(true);
      tocarAlerta();
      setTimeout(() => setNovoPedido(false), 10_000);
    };
    const intervalo = setInterval(verificar, 10_000);
    return () => clearInterval(intervalo);
  }, [proximo, somAtivo, tocarAlerta]);

  function abrirModal() {
    if (!proximo || associando) return;
    setErroModal(null);
    setModalAberto(true);
  }

  async function confirmarAssociacao() {
    if (associando) return;

    setAssociando(true);
    setErro(null);
    setMensagem(null);
    setErroModal(null);

    try {
      const response = await fetch(`${AGENTE_BIOMETRIA_URL}/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.detail || data.message || 'Falha ao identificar o separador pela digital.'
        );
      }

      setModalAberto(false);
      setMensagem(
        `Pedido #${data.pedido?.pedidoId ?? ''} enviado para separação${data.separador?.nome ? ` por ${data.separador.nome}` : ''}.`
      );
      await carregar(true);
    } catch (error) {
      setErroModal(
        error instanceof TypeError
          ? 'Agente biométrico indisponível neste computador. Verifique se está aberto e tente novamente.'
          : error instanceof Error
          ? error.message
          : 'Não foi possível conectar ao agente biométrico deste computador.'
      );
    } finally {
      setAssociando(false);
    }
  }

  const horaAtual = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(agora);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-app-bg">
      {/* Topbar fina */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Tablet className="h-5 w-5" />
          <span className="text-base font-semibold">Totem de Separação</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-base font-semibold tabular-nums text-slate-500">{horaAtual}</span>
          <button
            type="button"
            onClick={() => setSomAtivo((v) => !v)}
            className={cn(
              'flex h-10 items-center gap-2 rounded-xl border-2 px-3 text-sm font-semibold transition-colors',
              somAtivo
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-slate-200 bg-white text-slate-400'
            )}
            aria-pressed={somAtivo}
          >
            {somAtivo ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            Som
          </button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3"
            onClick={() => void carregar()}
            loading={loading}
            iconLeft={<RefreshCw className="h-5 w-5" />}
          >
            Atualizar
          </Button>
        </div>
      </header>

      {/* Corpo: card do pedido centralizado */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col gap-3">
          {erro ? (
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <p className="text-base font-medium">{erro}</p>
            </div>
          ) : null}

          {mensagem ? (
            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <p className="text-base font-medium">{mensagem}</p>
            </div>
          ) : null}

          {proximo ? (
            /* Estado: próximo pedido da fila disponível para separar */
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl border-2 bg-white transition-colors',
                novoPedido ? 'border-primary' : 'border-slate-200'
              )}
            >
              {novoPedido ? (
                <div className="flex shrink-0 animate-pulse items-center justify-center gap-2 bg-primary px-6 py-3 text-white">
                  <BellRing className="h-5 w-5" />
                  <span className="text-base font-bold uppercase tracking-wide">
                    {alertaParado ? 'Pedido parado na fila!' : 'Novo pedido na fila!'}
                  </span>
                </div>
              ) : null}
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-4 text-center">
                <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                  Próximo pedido
                </p>
                <p className="text-7xl font-black leading-none text-slate-900 xl:text-8xl">
                  #{proximo.pedidoId}
                </p>
                <div>
                  <p className="text-2xl font-bold text-slate-800">
                    {proximo.clienteNome || '-'}
                  </p>
                  {proximo.nomeFantasia ? (
                    <p className="mt-1 text-lg text-slate-500">{proximo.nomeFantasia}</p>
                  ) : null}
                </div>
                {proximo.regiaoRestrita ? (
                  <Badge
                    variant={proximo.prioridade ? 'warning' : 'neutral'}
                    className="px-4 py-1.5 text-sm"
                  >
                    {proximo.prioridade
                      ? 'Região restrita · carrega ter/qui — prioridade'
                      : 'Região restrita · carrega ter/qui'}
                  </Badge>
                ) : null}
                <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-slate-50 p-5 text-left text-base text-slate-700">
                  <p>
                    <span className="block text-xs font-semibold uppercase text-slate-400">Cidade</span>
                    {proximo.cidade ? `${proximo.cidade}${proximo.uf ? `/${proximo.uf}` : ''}` : '-'}
                  </p>
                  <p>
                    <span className="block text-xs font-semibold uppercase text-slate-400">Local</span>
                    {proximo.localNome || '-'}
                  </p>
                  <p>
                    <span className="block text-xs font-semibold uppercase text-slate-400">Valor</span>
                    {formatarValor(proximo.valorPedido)}
                  </p>
                  <p>
                    <span className="block text-xs font-semibold uppercase text-slate-400">Recebido</span>
                    {formatarDataHora(proximo.dataHoraRecebimento)}
                  </p>
                  <p>
                    <span className="block text-xs font-semibold uppercase text-slate-400">Previsão</span>
                    {formatarDataHora(proximo.previsaoEntrega)}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  className="h-16 w-full text-xl"
                  iconLeft={<PackageOpen className="h-7 w-7" />}
                  onClick={() => abrirModal()}
                  loading={associando}
                >
                  Separar pedido
                </Button>
              </div>
            </div>
          ) : (
            /* Estado: fila vazia */
            <div className="flex min-h-0 flex-1 flex-col rounded-xl border-2 border-dashed border-slate-200 bg-white">
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                <PackageOpen className="h-14 w-14 text-slate-300" />
                <p className="text-2xl font-semibold text-slate-500">
                  {loading ? 'Carregando...' : 'Nenhum pedido aguardando separação.'}
                </p>
                {!loading ? (
                  <p className="text-base text-slate-400">
                    A tela emitirá um alerta quando chegar um pedido.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Marquee de separações em andamento — desliza para a esquerda
          apenas quando o conteúdo transborda a faixa */}
      {ativas.length ? (
        <div
          ref={marqueeContainerRef}
          className="mx-4 mb-4 min-w-0 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
        >
          <div
            className={cn('flex w-max items-center py-3', marqueeAtivo && 'separacao-marquee')}
            style={
              marqueeAtivo
                ? { animationDuration: `${Math.max(20, ativas.length * 8)}s` }
                : undefined
            }
          >
            {(marqueeAtivo ? [0, 1] : [0]).map((copia) => (
              <div
                key={copia}
                className="flex items-center gap-3 pr-3"
                aria-hidden={copia === 1}
              >
                {ativas.map((item) => (
                  <div
                    key={`${copia}-${item.id}`}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 px-4 py-2"
                  >
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-sm font-semibold text-slate-800">
                      {item.usuario.nome}
                    </span>
                    <span className="text-sm text-slate-500">separando</span>
                    <span className="text-sm font-bold text-slate-900">
                      #{item.pedidoId}
                    </span>
                    <span className="text-xs text-slate-400">
                      há {tempoDecorrido(item.dataAssociacao, agora)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Captura e identificação biométrica no agente local do leitor */}
      <Modal
        isOpen={modalAberto}
        onClose={() => {
          if (!associando) setModalAberto(false);
        }}
        title="Identificação do separador"
        size="md"
        footer={
          <Button
            variant="primary"
            size="lg"
            className="h-14 w-full text-xl"
            iconLeft={<Fingerprint className="h-7 w-7" />}
            onClick={() => void confirmarAssociacao()}
            loading={associando}
          >
            Ler digital e iniciar separação
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {erroModal ? (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{erroModal}</p>
            </div>
          ) : null}
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 px-6 py-8 text-center">
            <Fingerprint className="h-14 w-14 text-primary" />
            <p className="text-base font-semibold text-slate-800">
              Apoie o dedo no leitor SecuGen
            </p>
            <p className="text-sm text-slate-500">
              Mantenha o dedo parado até a digital ser identificada. O código e a senha ADM são enviados pelo servidor.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SeparacaoPage() {
  // Rota pública (ver publicRoutes em _app.tsx): sem ProtectedRoute/AppLayout.
  // A fila usa o cookie do totem; a captura e associação passam pelo agente local.
  return (
    <>
      <Head>
        <title>Totem de Separação - ControlCarga</title>
      </Head>
      <SeparacaoContent />
    </>
  );
}
