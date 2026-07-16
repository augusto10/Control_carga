import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from '@mui/material';
import { Assessment, LocalShipping, QueryBuilder, ReceiptLong, Search } from '@mui/icons-material';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';

type Grupo = { total: number; geradas: number; naoGeradas: number; valor: number };
type Pedido = {
  pedidoId: number; cliente: string; vendedor: string; tipoEntrega?: string;
  dataHoraRecebimento: string; dentroCorte: boolean; entregaGerada: boolean;
  entregue: boolean; entregaIds: Array<number | string>; numeroNotas: string[]; valor: number; carregado?: boolean;
};
type Controle = {
  id: string; numeroManifesto?: string; dataCriacao: string; motorista: string;
  transportadora: string; placaVeiculo?: string; totalNotas: number; valor: number;
  peso: number; notas: Array<{ numeroNota: string; valor: number; peso: number }>;
};
type Relatorio = {
  periodo: { dataInicio: string; dataFim: string; horarioCorte: string };
  totais: Grupo & { caminhoesCarregados: number; notasCarregadas: number; valorCarregado: number; pesoCarregado: number };
  corte: { dentro: Grupo; fora: Grupo };
  pedidos: Pedido[];
  controles: Controle[];
};

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
const number = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value || 0);
const transportadoraNome = (value: string) => ({
  ACERT: 'ACCERT Transportes', ACCERT: 'ACCERT', EXPRESSO_GOIAS: 'Expresso Goiás',
  TERCEIRIZADA: 'Terceirizada', DETAFRA_TRANSPORTES: 'Detafra Transportes',
  RETIRA_VENDEDOR: 'Retira vendedor', RETIRA_CLIENTE: 'Retira cliente', VLOG: 'VLOG',
  ZANUELO_TRANSPORTE_LOGISTICA: 'Zanuelo Transporte e Logística',
} as Record<string, string>)[value] || value;

const tipoEntregaLabel = (value?: string | null) => {
  const tipo = String(value || '').trim().toUpperCase();
  if (!tipo) return '-';
  if (tipo === 'EPG') return 'ENT';
  if (tipo === 'ATO' || tipo === 'NO ATO' || tipo === 'RETIRA NO ATO') return 'ATO';
  return tipo;
};

function Metric({ title, value, subtitle, color = '#2563eb' }: { title: string; value: string | number; subtitle?: string; color?: string }) {
  return (
    <Card sx={{ width: '100%', height: 128, borderRadius: 3, borderTop: `4px solid ${color}` }}>
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 0.5, px: 0.8, '&:last-child': { pb: 0.5 } }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.66rem', mb: 0.25 }}>{title}</Typography>
        <Typography variant="h6" fontWeight={800} sx={{ my: 0, lineHeight: 0.9, fontSize: '1rem' }}>{value}</Typography>
        {subtitle ? <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, fontSize: '0.62rem', mt: 0.25 }}>{subtitle}</Typography> : null}
      </CardContent>
    </Card>
  );
}

function ScrollAreaComBarraSuperior({
  children,
}: {
  children: ReactNode;
}) {
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const topSpacerRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    const spacer = topSpacerRef.current;
    if (!top || !bottom || !spacer) return;

    const syncWidths = () => {
      const larguraConteudo = bottom.scrollWidth;
      const larguraVisivel = bottom.clientWidth;
      spacer.style.width = `${larguraConteudo}px`;
      top.style.display = larguraConteudo > larguraVisivel ? 'block' : 'none';
    };

    const syncFromTop = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      bottom.scrollLeft = top.scrollLeft;
      syncingRef.current = false;
    };

    const syncFromBottom = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      top.scrollLeft = bottom.scrollLeft;
      syncingRef.current = false;
    };

    syncWidths();
    top.scrollLeft = bottom.scrollLeft;

    top.addEventListener('scroll', syncFromTop, { passive: true });
    bottom.addEventListener('scroll', syncFromBottom, { passive: true });

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => syncWidths())
      : null;

    observer?.observe(bottom);
    if (bottom.firstElementChild instanceof HTMLElement) {
      observer?.observe(bottom.firstElementChild);
    }

    window.addEventListener('resize', syncWidths);

    return () => {
      top.removeEventListener('scroll', syncFromTop);
      bottom.removeEventListener('scroll', syncFromBottom);
      observer?.disconnect();
      window.removeEventListener('resize', syncWidths);
    };
  }, []);

  return (
    <Box>
      <Box
        ref={topScrollRef}
        sx={{ overflowX: 'auto', overflowY: 'hidden', borderBottom: '1px solid', borderColor: 'divider' }}
        aria-hidden="true"
      >
        <Box ref={topSpacerRef} sx={{ height: 16 }} />
      </Box>

      <Box ref={bottomScrollRef} sx={{ overflowX: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
}

export default function RelatorioEntregasPage() {
  const hoje = format(new Date(), 'yyyy-MM-dd');
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [dados, setDados] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = async () => {
    setLoading(true);
    setErro('');
    try {
      const params = new URLSearchParams({ dataInicio, dataFim });
      const response = await fetch(`/api/relatorios/entregas?${params}`, { credentials: 'include' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Não foi possível gerar o relatório');
      setDados(payload);
    } catch (error: any) {
      setErro(error?.message || 'Erro ao gerar relatório');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void carregar(); }, []);

  const transportadoras = useMemo(() => {
    const map = new Map<string, { caminhoes: number; notas: number; valor: number; peso: number }>();
    for (const controle of dados?.controles || []) {
      const atual = map.get(controle.transportadora) || { caminhoes: 0, notas: 0, valor: 0, peso: 0 };
      atual.caminhoes += 1; atual.notas += controle.totalNotas; atual.valor += controle.valor; atual.peso += controle.peso;
      map.set(controle.transportadora, atual);
    }
    return Array.from(map.entries());
  }, [dados]);

  const pedidosEntrega = useMemo(() => (
    dados?.pedidos.filter((pedido) => ['EPG', 'ENT'].includes(String(pedido.tipoEntrega || '').toUpperCase())) || []
  ), [dados]);

  const normalizarNumero = (valor: string) => valor.replace(/\D/g, '').replace(/^0+/, '') || '0';

  const notasCarregadas = useMemo(() => new Set(
    (dados?.controles || []).flatMap((controle) => controle.notas.map((nota) => normalizarNumero(String(nota.numeroNota || ''))))
  ), [dados]);

  const pedidoCarregado = (pedido: Pedido) => pedido.carregado === true || pedido.numeroNotas.some((nota) =>
    notasCarregadas.has(normalizarNumero(String(nota || '')))
  );

  const resumoEntrega = useMemo(() => ({
    total: pedidosEntrega.length,
    geradas: pedidosEntrega.filter((pedido) => pedido.entregaGerada).length,
    naoGeradas: pedidosEntrega.filter((pedido) => !pedido.entregaGerada).length,
    carregados: pedidosEntrega.filter((pedido) => pedidoCarregado(pedido)).length,
    notasCarregadas: pedidosEntrega.reduce((sum, pedido) => sum + pedido.numeroNotas.length, 0),
  }), [pedidosEntrega, notasCarregadas]);

  const resumoCorteEntrega = useMemo(() => {
    const resumir = (dentroCorte: boolean) => {
      const itens = pedidosEntrega.filter((pedido) => pedido.dentroCorte === dentroCorte);
      return {
        total: itens.length,
        geradas: itens.filter((pedido) => pedido.entregaGerada).length,
        naoGeradas: itens.filter((pedido) => !pedido.entregaGerada).length,
      };
    };
    return { dentro: resumir(true), fora: resumir(false) };
  }, [pedidosEntrega]);

  return (
    <ProtectedRoute>
      <AppLayout title="Relatório de Entregas" subtitle="Pedidos recebidos, entregas geradas e caminhões carregados" breadcrumbs={[{ label: 'Relatórios', href: '/relatorios' }, { label: 'Entregas' }]}>
        <Stack spacing={3}>
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'end' }}>
              <TextField label="Data inicial" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} InputLabelProps={{ shrink: true }} />
              <TextField label="Data final" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} InputLabelProps={{ shrink: true }} />
              <Button variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Search />} onClick={carregar} disabled={loading || !dataInicio || !dataFim}>
                Gerar relatório
              </Button>
            </Stack>
          </Paper>

          {erro && <Alert severity="error">{erro}</Alert>}
          {loading && !dados && <Box textAlign="center" py={8}><CircularProgress /></Box>}

          {dados && <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(128px, 1fr))', gap: 0.5, width: '100%', overflowX: 'auto', pb: 0.25 }}>
              <Metric title="Pedidos entrega" value={resumoEntrega.total} subtitle={money(pedidosEntrega.reduce((sum, pedido) => sum + pedido.valor, 0))} />
              <Metric title="Entregas geradas" value={resumoEntrega.geradas} color="#16a34a" />
              <Metric title="Não geradas" value={resumoEntrega.naoGeradas} color="#dc2626" />
              <Metric title="Carregados" value={resumoEntrega.carregados} subtitle={`${resumoEntrega.notasCarregadas} notas`} color="#7c3aed" />
              <Metric title="Dentro do horário de corte" value={resumoCorteEntrega.dentro.total} subtitle={`${resumoCorteEntrega.dentro.geradas} geradas • ${resumoCorteEntrega.dentro.naoGeradas} não geradas`} color="#0284c7" />
              <Metric title="Fora do horário de corte" value={resumoCorteEntrega.fora.total} subtitle={`${resumoCorteEntrega.fora.geradas} geradas • ${resumoCorteEntrega.fora.naoGeradas} não geradas`} color="#ea580c" />
            </Box>

            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}><Assessment color="primary" /><Typography variant="h6" fontWeight={700}>Pedidos recebidos</Typography></Stack>
              <ScrollAreaComBarraSuperior>
              <TableContainer
                sx={{
                  maxHeight: 560,
                  overflowY: 'auto',
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                    width: 10,
                    height: 10,
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: 'rgba(148, 163, 184, 0.12)',
                    borderRadius: 999,
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(100, 116, 139, 0.55)',
                    borderRadius: 999,
                  },
                }}
              >
                <Table stickyHeader size="small" sx={{ minWidth: 900, '& th, & td': { px: 0.75, py: 0.5, whiteSpace: 'nowrap' } }}>
                  <TableHead><TableRow><TableCell>Pedido</TableCell><TableCell>Recebimento</TableCell><TableCell>Corte</TableCell><TableCell>Cliente</TableCell><TableCell>Tipo</TableCell><TableCell>Entrega</TableCell><TableCell>Carregado</TableCell><TableCell>NF</TableCell><TableCell align="right">Valor</TableCell></TableRow></TableHead>
                  <TableBody>{pedidosEntrega.map((pedido) => <TableRow key={pedido.pedidoId} hover>
                    <TableCell><b>{pedido.pedidoId}</b></TableCell>
                    <TableCell>{pedido.dataHoraRecebimento ? format(new Date(pedido.dataHoraRecebimento), 'dd/MM/yyyy HH:mm:ss') : '-'}</TableCell>
                    <TableCell><Chip size="small" icon={<QueryBuilder />} color={pedido.dentroCorte ? 'info' : 'warning'} label={pedido.dentroCorte ? 'Dentro' : 'Fora'} /></TableCell>
                    <TableCell>{pedido.cliente}</TableCell><TableCell>{tipoEntregaLabel(pedido.tipoEntrega)}</TableCell>
                    <TableCell><Chip size="small" color={pedido.entregaGerada ? 'success' : 'error'} label={pedido.entregaGerada ? `Gerada${pedido.entregaIds.length ? ` #${pedido.entregaIds.join(', ')}` : ''}` : 'Não gerada'} /></TableCell>
                    <TableCell>{pedidoCarregado(pedido) ? <Chip size="small" color="success" label="✓" /> : '-'}</TableCell>
                    <TableCell>{pedido.numeroNotas.join(', ') || '-'}</TableCell><TableCell align="right">{money(pedido.valor)}</TableCell>
                  </TableRow>)}</TableBody>
                </Table>
              </TableContainer>
              </ScrollAreaComBarraSuperior>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}><LocalShipping color="primary" /><Typography variant="h6" fontWeight={700}>Caminhões carregados</Typography></Stack>
              <TableContainer><Table size="small">
                <TableHead><TableRow><TableCell>Controle</TableCell><TableCell>Data</TableCell><TableCell>Transportadora</TableCell><TableCell>Motorista</TableCell><TableCell>Placa</TableCell><TableCell>Notas</TableCell><TableCell align="right">Peso</TableCell><TableCell align="right">Valor</TableCell></TableRow></TableHead>
                <TableBody>{dados.controles.map((controle) => <TableRow key={controle.id} hover>
                  <TableCell><b>{controle.numeroManifesto || controle.id.slice(0, 8)}</b></TableCell><TableCell>{format(new Date(controle.dataCriacao), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{transportadoraNome(controle.transportadora)}</TableCell><TableCell>{controle.motorista}</TableCell><TableCell>{controle.placaVeiculo || '-'}</TableCell>
                  <TableCell title={controle.notas.map((nota) => nota.numeroNota).join(', ')}>{controle.totalNotas}</TableCell><TableCell align="right">{number(controle.peso)} kg</TableCell><TableCell align="right">{money(controle.valor)}</TableCell>
                </TableRow>)}</TableBody>
              </Table></TableContainer>
            </Paper>

            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}><ReceiptLong color="primary" /><Typography variant="h6" fontWeight={700}>Resumo por transportadora</Typography></Stack>
              <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Transportadora</TableCell><TableCell>Caminhões</TableCell><TableCell>Notas</TableCell><TableCell align="right">Peso</TableCell><TableCell align="right">Valor</TableCell></TableRow></TableHead>
                <TableBody>{transportadoras.map(([nome, resumo]) => <TableRow key={nome}><TableCell>{transportadoraNome(nome)}</TableCell><TableCell>{resumo.caminhoes}</TableCell><TableCell>{resumo.notas}</TableCell><TableCell align="right">{number(resumo.peso)} kg</TableCell><TableCell align="right">{money(resumo.valor)}</TableCell></TableRow>)}</TableBody>
              </Table></TableContainer>
            </Paper>
          </>}
        </Stack>
      </AppLayout>
    </ProtectedRoute>
  );
}

(RelatorioEntregasPage as any).usesAppLayout = true;
