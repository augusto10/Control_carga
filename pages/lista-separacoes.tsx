import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Printer, RefreshCw, Search } from 'lucide-react';
import AdminRoute from '@/components/admin/AdminRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import type { ProdutoEtiqueta } from '@/types/labels';

type PedidoStatus = {
  pedidoId: number;
  clienteNome: string;
  nomeFantasia?: string | null;
  localNome?: string | null;
  statusCodigo?: string;
  statusDescricao?: string;
  dataHoraRecebimento?: string | null;
  previsaoEntrega?: string | null;
  usuarioConfirmacaoNome?: string | null;
  valorPedido?: number | null;
  transportadoraNome?: string | null;
};

type DashboardStatusItem = {
  codigo: string;
  titulo: string;
  descricao: string;
  total: number;
  pedidos: PedidoStatus[];
};

type DashboardLogisticaResponse = {
  indicadores?: DashboardStatusItem[];
  error?: string;
};

type PedidoLogisticaDetalheResponse = {
  pedido?: Record<string, unknown>;
  logistica?: {
    itens_separacoes?: Array<Record<string, unknown>>;
    separacoes?: Array<Record<string, unknown>>;
  } | null;
  error?: string;
};

type PedidoProdutoImpressao = {
  codigoAdm: string;
  codigoBarras: string;
  nome: string;
  quantidade: string;
  estoque: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatarTexto(value: unknown, fallback = '-') {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function extrairProdutoId(item: Record<string, unknown>) {
  const value = item.PRODUTO_ID ?? item.produto_id ?? item.ITEM_ID ?? item.item_id;
  return formatarTexto(value, '');
}

function formatarData(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatarValor(value?: number) {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function ListaSeparacoesContent() {
  const [pedidos, setPedidos] = useState<PedidoStatus[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [imprimindo, setImprimindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function carregarPedidos() {
    try {
      setLoading(true);
      setErro(null);

      const hoje = new Date();
      const inicio = new Date(hoje);
      inicio.setDate(inicio.getDate() - 4);

      const dataInicio = inicio.toISOString().slice(0, 10);
      const dataFim = hoje.toISOString().slice(0, 10);

      const response = await fetch(`/api/dashboard/logistica-inicial?data_inicio=${dataInicio}&data_fim=${dataFim}`, {
        headers: { accept: 'application/json' },
      });
      const data: DashboardLogisticaResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Falha ao carregar pedidos.');
      }

      const indicadorPedidosNovos = (data.indicadores || []).find(
        (item) => item.codigo === 'PEDIDO_NOVO'
      );

      setPedidos(indicadorPedidosNovos?.pedidos || []);
    } catch (error: any) {
      setErro(error?.message || 'Falha ao carregar pedidos novos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarPedidos();
  }, []);

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return pedidos;

    return pedidos.filter((pedido) => {
      const campos = [
        String(pedido.pedidoId),
        pedido.clienteNome || '',
        pedido.nomeFantasia || '',
        pedido.localNome || '',
        pedido.transportadoraNome || '',
      ];

      return campos.some((campo) => campo.toLowerCase().includes(termo));
    });
  }, [busca, pedidos]);

  const todosVisiveisSelecionados =
    pedidosFiltrados.length > 0 &&
    pedidosFiltrados.every((pedido) => selecionados.includes(String(pedido.pedidoId)));

  function alternarPedido(pedidoId: string) {
    setSelecionados((atual) =>
      atual.includes(pedidoId)
        ? atual.filter((item) => item !== pedidoId)
        : [...atual, pedidoId]
    );
  }

  function alternarTodosVisiveis() {
    const idsVisiveis = pedidosFiltrados.map((pedido) => String(pedido.pedidoId));

    setSelecionados((atual) => {
      if (idsVisiveis.every((id) => atual.includes(id))) {
        return atual.filter((id) => !idsVisiveis.includes(id));
      }

      return Array.from(new Set([...atual, ...idsVisiveis]));
    });
  }

  async function imprimirLista() {
    const selecionadosSet = new Set(selecionados);
    const itens = pedidos.filter((pedido) => selecionadosSet.has(String(pedido.pedidoId)));

    if (itens.length === 0) {
      setErro('Selecione ao menos um pedido para imprimir.');
      return;
    }

    const confirmou = window.confirm(
      `Deseja imprimir a lista de separacao de ${itens.length} pedido(s)? A emissao sera realizada automaticamente no ERP.`
    );

    if (!confirmou) return;

    const popup = window.open('', '_blank', 'width=1024,height=768');
    if (!popup) {
      setErro('Nao foi possivel abrir a janela de impressao. Verifique o bloqueador de pop-ups.');
      return;
    }

    popup.document.write(`
      <html>
        <head><title>Preparando lista de separacao</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <p>Emitindo os pedidos no ERP e preparando a lista de separacao...</p>
        </body>
      </html>
    `);
    popup.document.close();

    try {
      setImprimindo(true);
      setErro(null);
      setMensagem(null);

      const erpResponse = await fetch('/api/erp/separacao/emitir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({ pedidoIds: itens.map((pedido) => pedido.pedidoId) }),
      });

      const erpData = await erpResponse.json();

      if (!erpResponse.ok || !erpData.success) {
        throw new Error(
          erpData.details || erpData.message || 'Falha ao emitir a lista de separacao no ERP.'
        );
      }

      const detalhes = await Promise.all(
        itens.map(async (pedido) => {
          const response = await fetch(`/api/pedidos/${pedido.pedidoId}/logistica`, {
            headers: { accept: 'application/json' },
          });

          const data: PedidoLogisticaDetalheResponse = await response.json();

          if (!response.ok) {
            throw new Error(data.error || `Falha ao carregar produtos do pedido ${pedido.pedidoId}.`);
          }

          const itensSeparacao = Array.isArray(data.logistica?.itens_separacoes)
            ? data.logistica?.itens_separacoes || []
            : [];

          const produtosComAdm = await Promise.all(
            itensSeparacao.map(async (item) => {
              const produtoId = extrairProdutoId(item);
              let codigoAdm = formatarTexto(item.PRODUTO_ID, '-');
              let codigoBarras = formatarTexto(item.CODIGO_BARRAS, '-');
              let estoque = '-';

              if (produtoId) {
                try {
                  const produtoResponse = await fetch(`/api/etiquetas/produto/${encodeURIComponent(produtoId)}`, {
                    headers: { accept: 'application/json' },
                  });

                  if (produtoResponse.ok) {
                    const produto = (await produtoResponse.json()) as ProdutoEtiqueta;
                    codigoAdm = formatarTexto(produto.codigoAdm, codigoAdm);
                    codigoBarras = formatarTexto(produto.codigoBarras, codigoBarras);
                    estoque = formatarTexto(produto.quantidadeEstoque, estoque);
                  }
                } catch {
                  // Mantemos fallback para nao bloquear a impressao.
                }
              }

              return {
                codigoAdm,
                codigoBarras,
                nome: formatarTexto(item.PRODUTO_NOME, 'Produto nao informado'),
                quantidade: formatarTexto(item.QUANTIDADE, '-'),
                estoque,
              };
            })
          );

          const produtos: PedidoProdutoImpressao[] = produtosComAdm;

          return {
            pedido,
            produtos,
          };
        })
      );

      const blocosPedidos = detalhes
      .map(
        ({ pedido, produtos }, index) => `
          <section class="pedido-bloco">
            <div class="pedido-head">
              <div>
                <h2>Pedido #${escapeHtml(pedido.pedidoId)}</h2>
                <p><strong>Cliente:</strong> ${escapeHtml(pedido.clienteNome || '-')}</p>
                <p><strong>Fantasia:</strong> ${escapeHtml(pedido.nomeFantasia || '-')}</p>
              </div>
              <div>
                <p><strong>Local:</strong> ${escapeHtml(pedido.localNome || '-')}</p>
                <p><strong>Recebimento:</strong> ${escapeHtml(formatarData(pedido.dataHoraRecebimento))}</p>
                <p><strong>Valor:</strong> ${escapeHtml(formatarValor(pedido.valorPedido ?? undefined))}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Codigo ADM</th>
                  <th>Codigo Barras</th>
                  <th>Produto</th>
                  <th>Qtd.</th>
                  <th>Estoque</th>
                </tr>
              </thead>
              <tbody>
                ${
                  produtos.length > 0
                    ? produtos
                        .map(
                          (produto, produtoIndex) => `
                            <tr>
                              <td>${produtoIndex + 1}</td>
                              <td>${escapeHtml(produto.codigoAdm)}</td>
                              <td>${escapeHtml(produto.codigoBarras)}</td>
                              <td>${escapeHtml(produto.nome)}</td>
                              <td>${escapeHtml(produto.quantidade)}</td>
                              <td>${escapeHtml(produto.estoque)}</td>
                            </tr>
                          `
                        )
                        .join('')
                    : `
                      <tr>
                        <td colspan="6">Nenhum produto retornado pela API para este pedido.</td>
                      </tr>
                    `
                }
              </tbody>
            </table>
            ${index < detalhes.length - 1 ? '<div class="page-break"></div>' : ''}
          </section>
        `
      )
      .join('');

      popup.document.open();
      popup.document.write(`
        <html>
          <head>
            <title>Lista de Separacoes</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { margin: 0 0 8px; }
              h2 { margin: 0 0 8px; font-size: 18px; }
              p { margin: 0 0 6px; color: #475569; }
              table { width: 100%; border-collapse: collapse; margin-top: 14px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
              th { background: #e2e8f0; }
              .pedido-bloco { margin-top: 24px; }
              .pedido-head { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 12px; }
              .page-break { page-break-after: always; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>Lista de Separacoes</h1>
            <p>Gerado em ${escapeHtml(
              new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'medium',
              }).format(new Date())
            )}</p>
            ${blocosPedidos}
          </body>
        </html>
      `);
      popup.document.close();
      popup.focus();
      popup.print();
      setMensagem(
        erpData.message ||
          `Emissao concluida no ERP e lista preparada para ${itens.length} pedido(s).`
      );
    } catch (error: any) {
      popup.close();
      setErro(
        error?.message ||
          'Falha ao emitir no ERP ou montar a impressao detalhada dos pedidos.'
      );
    } finally {
      setImprimindo(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-200 bg-amber-50">
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
          <div className="space-y-1 text-sm text-amber-900">
            <p className="font-semibold">Automacao local do ERP</p>
            <p>
              Ao imprimir, os pedidos selecionados sao emitidos automaticamente no ERP antes da
              abertura da lista de separacao.
            </p>
            <p>
              A lista abaixo espelha o mesmo conjunto do card Pedidos Novos da tela Acompanhamento de Pedidos.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Pedidos novos para separacao"
          subtitle="Aqui aparecem somente os mesmos pedidos do card Pedidos Novos do acompanhamento de pedidos."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={carregarPedidos} loading={loading} iconLeft={<RefreshCw className="h-4 w-4" />}>
                Atualizar
              </Button>
              <Button variant="outline" onClick={() => void imprimirLista()} loading={imprimindo} iconLeft={<Printer className="h-4 w-4" />}>
                Imprimir lista
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por pedido, cliente, local ou transportadora"
                className="w-full bg-transparent text-sm outline-none"
              />
          </label>

          <Button variant="secondary" onClick={alternarTodosVisiveis}>
            {todosVisiveisSelecionados ? 'Desmarcar visiveis' : 'Selecionar visiveis'}
          </Button>
        </div>
      </Card>

      {erro ? (
        <Card className="border-rose-200 bg-rose-50 text-rose-800">
          <p className="text-sm font-medium">{erro}</p>
        </Card>
      ) : null}

      {mensagem ? (
        <Card className="border-emerald-200 bg-emerald-50 text-emerald-800">
          <p className="text-sm font-medium">{mensagem}</p>
        </Card>
      ) : null}

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={todosVisiveisSelecionados}
                    onChange={alternarTodosVisiveis}
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600">Pedido</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Cliente</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Fantasia</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Local</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Recebimento</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Carregando pedidos novos para separacao...
                  </td>
                </tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Nenhum pedido novo para separacao encontrado.
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((pedido) => {
                  const pedidoId = String(pedido.pedidoId);
                  const marcado = selecionados.includes(pedidoId);

                  return (
                    <tr key={pedidoId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => alternarPedido(pedidoId)}
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">#{pedidoId}</td>
                      <td className="px-4 py-3 text-slate-700">{pedido.clienteNome || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{pedido.nomeFantasia || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{pedido.localNome || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{formatarData(pedido.dataHoraRecebimento)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatarValor(pedido.valorPedido ?? undefined)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default function ListaSeparacoesPage() {
  return (
    <AdminRoute>
      <Head>
        <title>Pedidos Novos para Separacao - ControlCarga</title>
      </Head>
      <AppLayout
        title="Pedidos Novos para Separacao"
        subtitle="Impressao local e disparo da emissao no ERP"
      >
        <ListaSeparacoesContent />
      </AppLayout>
    </AdminRoute>
  );
}

(ListaSeparacoesPage as any).usesAppLayout = true;
