import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { CalendarRange, Download, Loader2, Printer, RefreshCw, Share2, X } from 'lucide-react';

type StatusCode =
  | 'PEDIDO_NOVO'
  | 'PEDIDO_EM_SEPARACAO'
  | 'PEDIDO_SEPARADO'
  | 'PEDIDO_EMBARCADO'
  | 'PEDIDOS_EMBARCADOS'
  | 'PENDENCIAS'
  | 'ALERTAS_NAO_SEPARADOS'
  | 'ALERTAS_NAO_CONFERIDOS'
  | 'ALERTAS_NAO_EMBARCADOS';

type DashboardPedidoItem = {
  pedidoId: number;
  tipoEntrega?: string | null;
  clienteNome: string;
  nomeFantasia: string | null;
  dataHoraRecebimento: string | null;
  transportadoraNome: string | null;
  totalItensPendentes: number;
  produtosPendentes: Array<{
    produtoId: number | null;
    codigo: string | null;
    nome: string;
    quantidade: number;
  }>;
};

type DashboardStatusItem = {
  codigo: StatusCode;
  titulo: string;
  total: number;
  pedidos: DashboardPedidoItem[];
};

type DashboardLogisticaData = {
  generatedAt: string;
  filtros: {
    dataInicio?: string | null;
    dataFim: string;
  };
  indicadores: DashboardStatusItem[];
  resumo?: {
    pedidosRetirados?: number;
  };
  error?: string;
  warning?: string;
};

const ETAPAS_PRINCIPAIS: StatusCode[] = [
  'PEDIDO_NOVO',
  'PEDIDO_EM_SEPARACAO',
  'PEDIDO_SEPARADO',
  'PEDIDO_EMBARCADO',
  'PEDIDOS_EMBARCADOS',
];

const TIPOS_RETIRADA = new Set(['ATO', 'NDF', 'RDL', 'RLR']);

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value: string) => {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const getPeriodoAtual = () => {
  const hoje = new Date();
  // Retorna os últimos 7 dias ao invés de apenas hoje
  const seteDidasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dataInicio = formatDateInputValue(seteDidasAtras);
  const dataFim = formatDateInputValue(hoje);
  return { dataInicio, dataFim };
};

const getIndicador = (dashboard: DashboardLogisticaData | null, codigo: StatusCode) =>
  dashboard?.indicadores.find((item) => item.codigo === codigo);

const isDashboardFallbackVazio = (dashboard: DashboardLogisticaData) =>
  Boolean(dashboard.warning) && (dashboard.indicadores || []).every((item) => (item.total || 0) === 0);

const normalizeTransportadora = (value: string | null | undefined) => {
  const normalized = (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  if (normalized.includes('ACCERT')) return 'ACCERT';
  if (normalized.includes('EXPRESSO') || normalized.includes('GOIAS')) return 'EXPRESSO GOIAS';
  if (normalized.includes('ZANUELLO') || normalized.includes('ZANUELO') || normalized.includes('ZANEULO')) return 'ZANUELLO';
  if (normalized.includes('DETAFRA')) return 'DETAFRA';
  if (normalized.includes('TERCEIRIZADA')) return 'TERCEIRIZADA';
  return null;
};

export default function ResumoPedidosPage() {
  const [periodo, setPeriodo] = useState(getPeriodoAtual);
  const [aplicado, setAplicado] = useState(getPeriodoAtual);
  const [dashboardEtapas, setDashboardEtapas] = useState<DashboardLogisticaData | null>(null);
  const [dashboardAlertas, setDashboardAlertas] = useState<DashboardLogisticaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [compartilhandoPdf, setCompartilhandoPdf] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ url: string; arquivo: File } | null>(null);
  const forcarProximaConsultaRef = useRef(false);

  const carregar = useCallback(async (forceRefresh = false, alvo = aplicado) => {
    if (alvo.dataInicio > alvo.dataFim) {
      setError('A data inicial não pode ser maior que a data final.');
      return;
    }

    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const paramsEtapas = new URLSearchParams({
      data_inicio: alvo.dataInicio,
      data_fim: alvo.dataFim,
      escopo: 'principal',
    });
    if (forceRefresh) {
      const nonce = String(Date.now());
      paramsEtapas.set('force', '1');
      paramsEtapas.set('t', nonce);
    }

    try {
      const etapasResponse = await fetch(`/api/dashboard/logistica-inicial?${paramsEtapas.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });

      const etapasData = await etapasResponse.json();
      if (!etapasResponse.ok) {
        throw new Error(etapasData.error || 'Falha ao carregar o resumo de pedidos.');
      }
      if (isDashboardFallbackVazio(etapasData)) {
        throw new Error(etapasData.warning);
      }

      setDashboardEtapas(etapasData);
      setDashboardAlertas(etapasData);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Erro ao carregar o relatório.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setAplicando(false);
    }
  }, [aplicado]);

  const aplicarPeriodo = useCallback(() => {
    setAplicando(true);
    if (periodo.dataInicio === aplicado.dataInicio && periodo.dataFim === aplicado.dataFim) {
      void carregar(true, periodo);
      return;
    }
    forcarProximaConsultaRef.current = true;
    setAplicado(periodo);
  }, [aplicado.dataFim, aplicado.dataInicio, carregar, periodo]);

  useEffect(() => {
    const forceRefresh = forcarProximaConsultaRef.current;
    forcarProximaConsultaRef.current = false;
    void carregar(forceRefresh, aplicado);
  }, [aplicado, carregar]);

  const pedidosRetiradosPorId = useMemo(() => {
    const pedidos = new Map<number, DashboardPedidoItem>();

    for (const codigo of ETAPAS_PRINCIPAIS) {
      const indicador = getIndicador(dashboardEtapas, codigo);
      for (const pedido of indicador?.pedidos || []) {
        pedidos.set(pedido.pedidoId, pedido);
      }
    }

    const retirados = new Set<number>();
    for (const pedido of pedidos.values()) {
      if (TIPOS_RETIRADA.has(String(pedido.tipoEntrega || '').toUpperCase())) {
        retirados.add(pedido.pedidoId);
      }
    }

    return retirados;
  }, [dashboardEtapas]);

  const pedidosRetirados = dashboardEtapas?.resumo?.pedidosRetirados ?? pedidosRetiradosPorId.size;

  const pedidosEmbarcados = getIndicador(dashboardEtapas, 'PEDIDOS_EMBARCADOS');
  const pedidosEmbarcadosAjustados = useMemo(() => {
    const pedidos = pedidosEmbarcados?.pedidos || [];
    return {
      total: pedidos.length,
      pedidos,
    };
  }, [pedidosEmbarcados]);

  const transportadoras = useMemo(() => {
    const totais = {
      accert: 0,
      expressoGoias: 0,
      zanuello: 0,
      detafra: 0,
      terceirizada: 0,
    };

    for (const pedido of pedidosEmbarcadosAjustados.pedidos) {
      const transportadora = normalizeTransportadora(pedido.transportadoraNome);
      if (transportadora === 'ACCERT') totais.accert += 1;
      if (transportadora === 'EXPRESSO GOIAS') totais.expressoGoias += 1;
      if (transportadora === 'ZANUELLO') totais.zanuello += 1;
      if (transportadora === 'DETAFRA') totais.detafra += 1;
      if (transportadora === 'TERCEIRIZADA') totais.terceirizada += 1;
    }

    return totais;
  }, [pedidosEmbarcadosAjustados]);

  const pendencias = getIndicador(dashboardAlertas, 'PENDENCIAS');
  const itensPendentes = useMemo(
    () =>
      (pendencias?.pedidos || []).flatMap((pedido) => {
        if (pedido.produtosPendentes.length > 0) {
          return pedido.produtosPendentes.map((produto) => ({
            chave: `${pedido.pedidoId}-${produto.produtoId ?? produto.codigo ?? produto.nome}`,
            texto: `Pedido ${pedido.pedidoId} | Produto ${produto.codigo ? `${produto.codigo} - ` : ''}${produto.nome} | Qtd. ${produto.quantidade}`,
          }));
        }

        return [{
          chave: `pedido-${pedido.pedidoId}`,
          texto: `Pedido ${pedido.pedidoId} | ${pedido.totalItensPendentes} item(ns) pendente(s)`,
        }];
      }),
    [pendencias]
  );

  const textoRelatorio = useMemo(() => {
    const dataTitulo = aplicado.dataInicio === aplicado.dataFim
      ? formatDateLabel(aplicado.dataFim)
      : `${formatDateLabel(aplicado.dataInicio)} a ${formatDateLabel(aplicado.dataFim)}`;

    return [
      `RESUMO DE PEDIDOS ${dataTitulo}`,
      '',
      'ENTREGUES',
      `- PEDIDOS EMBARCADOS: ${pedidosEmbarcadosAjustados.total}`,
      `  -> ACCERT: ${transportadoras.accert}`,
      `  -> EXPRESSO GOIAS: ${transportadoras.expressoGoias}`,
      `  -> ZANUELLO: ${transportadoras.zanuello}`,
      `  -> DETAFRA: ${transportadoras.detafra}`,
      `  -> TERCEIRIZADA: ${transportadoras.terceirizada}`,
      '',
      'RETIRADOS',
      `- PEDIDOS RETIRADOS: ${pedidosRetirados}`,
      '',
      'ALERTAS',
      `- NÃO SEPARADOS: ${getIndicador(dashboardAlertas, 'ALERTAS_NAO_SEPARADOS')?.total || 0}`,
      `- NÃO CONFERIDOS: ${getIndicador(dashboardAlertas, 'ALERTAS_NAO_CONFERIDOS')?.total || 0}`,
      `- NÃO EMBARCADOS: ${getIndicador(dashboardAlertas, 'ALERTAS_NAO_EMBARCADOS')?.total || 0}`,
      '',
      'PENDÊNCIAS',
      ...(itensPendentes.length > 0 ? itensPendentes.map((item) => `- ${item.texto}`) : ['- Nenhuma pendência encontrada']),
    ].join('\n');
  }, [aplicado, dashboardAlertas, dashboardEtapas, itensPendentes, pedidosEmbarcadosAjustados.total, pedidosRetirados, transportadoras.accert, transportadoras.detafra, transportadoras.expressoGoias, transportadoras.terceirizada, transportadoras.zanuello]);

  const criarArquivoPdf = useCallback(async () => {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const templateResponse = await fetch('/templates/modelo-romaneio.pdf');
    if (!templateResponse.ok) {
      throw new Error('Modelo de romaneio nao encontrado.');
    }

    const templateBytes = await templateResponse.arrayBuffer();
    const template = await PDFDocument.load(templateBytes);
    const documento = await PDFDocument.create();
    const fonte = await documento.embedFont(StandardFonts.Helvetica);
    const fonteNegrito = await documento.embedFont(StandardFonts.HelveticaBold);
    const margem = 46;
    const alturaLinha = 16;
    const [primeiraPagina] = await documento.copyPages(template, [0]);
    documento.addPage(primeiraPagina);
    let pagina = primeiraPagina;
    let { height: altura, width: largura } = pagina.getSize();
    let y = altura - 170;

    const ocultarTituloTemplate = (paginaAtual: any) => {
      // Oculta a linha do título do template, sem cobrir o resto do cabeçalho.
      // A área do texto fica no centro do cabeçalho e precisa cobrir um pouco mais para
      // garantir que o texto desapareça mesmo com variações de renderização do template.
      paginaAtual.drawRectangle({
        x: 110,
        y: 86,
        width: 380,
        height: 36,
        color: rgb(1, 1, 1),
      });
    };

    ocultarTituloTemplate(pagina);

    const novaPagina = async () => {
      const [paginaModelo] = await documento.copyPages(template, [0]);
      documento.addPage(paginaModelo);
      pagina = paginaModelo;
      altura = pagina.getSize().height;
      largura = pagina.getSize().width;
      y = altura - 170;
      ocultarTituloTemplate(pagina);
    };

    for (const linha of textoRelatorio.split('\n')) {
      if (y < margem) await novaPagina();
      const cabecalho = linha.length > 0 && !linha.startsWith('-') && linha === linha.toUpperCase();
      pagina.drawText(linha || ' ', {
        x: margem,
        y,
        size: cabecalho ? 12 : 10,
        font: cabecalho ? fonteNegrito : fonte,
        color: cabecalho ? rgb(0.06, 0.18, 0.32) : rgb(0.16, 0.2, 0.27),
      });
      y -= cabecalho ? alturaLinha + 3 : alturaLinha;
    }

    const bytes = await documento.save();
    const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
    const nome = `resumo-pedidos-${aplicado.dataInicio}-${aplicado.dataFim}.pdf`;
    return new File([blob], nome, { type: 'application/pdf' });
  }, [aplicado.dataFim, aplicado.dataInicio, textoRelatorio]);

  const gerarPdfParaVisualizacao = useCallback(async () => {
    setGerandoPdf(true);
    try {
      const arquivo = await criarArquivoPdf();
      setPdfPreview((atual) => {
        if (atual) URL.revokeObjectURL(atual.url);
        return { url: URL.createObjectURL(arquivo), arquivo };
      });
    } catch {
      setError('Nao foi possivel gerar o PDF do relatorio.');
    } finally {
      setGerandoPdf(false);
    }
  }, [criarArquivoPdf]);

  const fecharPdfPreview = useCallback(() => {
    setPdfPreview((atual) => {
      if (atual) URL.revokeObjectURL(atual.url);
      return null;
    });
  }, []);

  const baixarPdfPreview = useCallback(() => {
    if (!pdfPreview) return;
    const link = document.createElement('a');
    link.href = pdfPreview.url;
    link.download = pdfPreview.arquivo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [pdfPreview]);

  const compartilharPdfPreview = useCallback(async () => {
    if (!pdfPreview || !navigator.share) return;
    const podeCompartilharArquivo =
      typeof navigator.canShare !== 'function' || navigator.canShare({ files: [pdfPreview.arquivo] });

    if (!podeCompartilharArquivo) return;
    try {
      await navigator.share({ title: 'Resumo de Pedidos', files: [pdfPreview.arquivo] });
    } catch {
      // O usuario pode fechar a janela nativa de compartilhamento sem concluir.
    }
  }, [pdfPreview]);

  const compartilharPdf = useCallback(async () => {
    setCompartilhandoPdf(true);
    try {
      const arquivo = await criarArquivoPdf();
      const podeCompartilharArquivo =
        typeof navigator.canShare !== 'function' || navigator.canShare({ files: [arquivo] });

      if (navigator.share && podeCompartilharArquivo) {
        await navigator.share({ title: 'Resumo de Pedidos', files: [arquivo] });
        return;
      }

      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = arquivo.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError('Nao foi possivel preparar o PDF para compartilhamento.');
    } finally {
      setCompartilhandoPdf(false);
    }
  }, [criarArquivoPdf]);

  const relatorioIndisponivel = Boolean(error);

  return (
    <ProtectedRoute>
      <AppLayout
        title="Resumo de Pedidos"
        subtitle="Relatório do fim do dia com etapas, alertas e pendências."
        breadcrumbs={[
          { label: 'Relatórios', href: '/relatorios' },
          { label: 'Resumo de Pedidos' },
        ]}
      >
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Resumo de Pedidos</h2>
                <p className="text-sm text-slate-500">
                  As etapas, alertas e pendências usam o período selecionado no filtro.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto]">
                <label className="space-y-1 text-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Data inicial
                  </span>
                  <input
                    type="date"
                    value={periodo.dataInicio}
                    onChange={(event) => setPeriodo((atual) => ({ ...atual, dataInicio: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-primary"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Data final
                  </span>
                  <input
                    type="date"
                    value={periodo.dataFim}
                    onChange={(event) => setPeriodo((atual) => ({ ...atual, dataFim: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none transition focus:border-primary"
                  />
                </label>
                <button
                  type="button"
                  onClick={aplicarPeriodo}
                  disabled={aplicando}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                >
                  {aplicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
                  {aplicando ? 'Atualizando relatório...' : 'Aplicar'}
                </button>
                <button
                  type="button"
                  onClick={() => void carregar(true, aplicado)}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50',
                    refreshing && 'opacity-70'
                  )}
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                  Atualizar
                </button>
              </div>
            </div>
          </Card>

          {error && (
            <Card className="border-rose-200 bg-rose-50 text-rose-700">
              <p className="text-sm font-medium">{error}</p>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos embarcados</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{relatorioIndisponivel ? '-' : pedidosEmbarcadosAjustados.total}</p>
            </Card>
            <Card className="border-slate-200 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pedidos retirados</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{relatorioIndisponivel ? '-' : pedidosRetirados}</p>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {aplicado.dataInicio === aplicado.dataFim
                    ? `Resumo de Pedidos ${formatDateLabel(aplicado.dataFim)}`
                    : `Resumo de Pedidos ${formatDateLabel(aplicado.dataInicio)} a ${formatDateLabel(aplicado.dataFim)}`}
                </h3>
                <p className="text-sm text-slate-500">
                  Gerado com base nas etapas, alertas e pendências do período filtrado.
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void gerarPdfParaVisualizacao()}
                  disabled={loading || relatorioIndisponivel || gerandoPdf}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {gerandoPdf ? 'Gerando PDF...' : 'Gerar PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => void compartilharPdf()}
                  disabled={loading || relatorioIndisponivel || compartilhandoPdf}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" />
                  {compartilhandoPdf ? 'Preparando...' : 'Compartilhar'}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </button>
              </div>
            </div>

            <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              {loading ? 'Carregando relatório...' : relatorioIndisponivel ? 'Relatorio indisponivel no momento. Tente atualizar novamente em alguns instantes.' : textoRelatorio}
            </div>
          </Card>
        </div>

        {pdfPreview && (
          <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 p-3 sm:p-6">
            <div className="mx-auto flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Visualizar resumo de pedidos</h2>
                  <p className="text-xs text-slate-500">Confira o relatório e escolha uma opção.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(pdfPreview.url, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </button>
                  <button
                    type="button"
                    onClick={() => void compartilharPdfPreview()}
                    disabled={typeof navigator === 'undefined' || !navigator.share}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Share2 className="h-4 w-4" />
                    Compartilhar
                  </button>
                  <button
                    type="button"
                    onClick={baixarPdfPreview}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Baixar
                  </button>
                  <button
                    type="button"
                    onClick={fecharPdfPreview}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Fechar visualizacao do PDF"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <iframe
                src={pdfPreview.url}
                title="Visualizacao do resumo de pedidos"
                className="min-h-0 flex-1 bg-slate-100"
              />
            </div>
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}

type ResumoPedidosPageWithLayout = typeof ResumoPedidosPage & { usesAppLayout?: boolean };

(ResumoPedidosPage as ResumoPedidosPageWithLayout).usesAppLayout = true;
