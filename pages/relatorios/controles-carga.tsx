import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  Divider,
  Stack,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert
} from '@mui/material';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/router';
import { AppLayout } from '../../components/layout/AppLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface RelatorioControle {
  id: string;
  motorista: string;
  transportadora: string;
  qtdPalletsLevados: number;
  qtdPalletsDevolvidos: number;
  diferencaPallets: number;
  totalNotas: number;
  dataCriacao: string;
  freteInformado?: boolean;
  valorFrete?: number | null;
  fretePago?: boolean;
  fretePagoEm?: string | null;
  fretePagamentoId?: string | null;
  status: string;
  assinaturaMotorista: boolean;
  assinaturaResponsavel: boolean;
}

interface ResumoTransportadora {
  transportadora: string;
  totalControles: number;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  diferencaPallets: number;
  totalNotas: number;
  controlesAssinados: number;
  percentualAssinados: number;
  totalFretes: number;
}

interface ResumoMotorista {
  motorista: string;
  transportadora: string;
  totalControles: number;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  diferencaPallets: number;
  totalNotas: number;
  controlesAssinados: number;
  totalFretes: number;
}

interface DadosGrafico {
  transportadoras: {
    labels: string[];
    controles: number[];
    pallets: number[];
  };
  timeline: {
    labels: string[];
    controles: number[];
  };
  status: {
    labels: string[];
    valores: number[];
  };
}

interface Totais {
  totalControles: number;
  controlesFinalizados: number;
  controlesPendentes: number;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  totalNotas: number;
  totalFretes: number;
  totalFretesPagos: number;
  totalFretesPendentes: number;
}

const RelatorioControlesCargaPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  
  // Estados dos dados
  const [controles, setControles] = useState<RelatorioControle[]>([]);
  const [motoristasDisponiveis, setMotoristasDisponiveis] = useState<string[]>([]);
  const [selecionadosPagamento, setSelecionadosPagamento] = useState<string[]>([]);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [pagamentoSalvando, setPagamentoSalvando] = useState(false);
  const [comprovanteBase64, setComprovanteBase64] = useState<string>('');
  const [comprovanteNome, setComprovanteNome] = useState<string>('');
  const [observacaoPagamento, setObservacaoPagamento] = useState<string>('');
  const [resumoTransportadoras, setResumoTransportadoras] = useState<ResumoTransportadora[]>([]);
  const [resumoMotoristas, setResumoMotoristas] = useState<ResumoMotorista[]>([]);
  const [dadosGrafico, setDadosGrafico] = useState<DadosGrafico>({
    transportadoras: { labels: [], controles: [], pallets: [] },
    timeline: { labels: [], controles: [] },
    status: { labels: [], valores: [] }
  });
  const [totais, setTotais] = useState<Totais>({
    totalControles: 0,
    controlesFinalizados: 0,
    controlesPendentes: 0,
    totalPalletsLevados: 0,
    totalPalletsDevolvidos: 0,
    totalNotas: 0,
    totalFretes: 0,
    totalFretesPagos: 0,
    totalFretesPendentes: 0
  });
  
  // Filtros
  const [dataInicio, setDataInicio] = useState<Date | null>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | null>(endOfMonth(new Date()));
  const [transportadoraFiltro, setTransportadoraFiltro] = useState<string>('TODAS');
  const [motoristaFiltro, setMotoristaFiltro] = useState<string>('');
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');

  const transportadoras = [
    { id: 'TODAS', nome: 'Todas as Transportadoras' },
    { id: 'ACERT', nome: 'ACCERT Transportes' },
    { id: 'ACCERT', nome: 'ACCERT' },
    { id: 'EXPRESSO_GOIAS', nome: 'Expresso Goiás' },
    { id: 'TERCEIRIZADA', nome: 'Terceirizada' },
    { id: 'DETAFRA_TRANSPORTES', nome: 'Detafra Transportes' },
    { id: 'RETIRA_VENDEDOR', nome: 'Retira Vendedor' },
    { id: 'RETIRA_CLIENTE', nome: 'Retira Cliente' },
    { id: 'VLOG', nome: 'VLOG Transportes' },
    { id: 'ZANUELO_TRANSPORTE_LOGISTICA', nome: 'Zanuelo Transporte e Logistica' }
  ];

  const statusOptions = [
    { id: 'TODOS', nome: 'Todos os Status' },
    { id: 'FINALIZADO', nome: 'Finalizados' },
    { id: 'PENDENTE', nome: 'Pendentes' }
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    buscarDados();
  }, [user, router]);

  const buscarDados = async () => {
    setLoading(true);
    setSelecionadosPagamento([]);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('dataInicio', format(dataInicio, 'yyyy-MM-dd'));
      if (dataFim) params.append('dataFim', format(dataFim, 'yyyy-MM-dd'));
      if (transportadoraFiltro && transportadoraFiltro !== 'TODAS') {
        params.append('transportadora', transportadoraFiltro);
      }
      if (motoristaFiltro.trim()) {
        params.append('motorista', motoristaFiltro.trim());
      }
      if (statusFiltro && statusFiltro !== 'TODOS') {
        params.append('status', statusFiltro);
      }

      const response = await fetch(`/api/relatorios/controles-carga?${params.toString()}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do relatório');
      }

      const resultado = await response.json();
      setControles(resultado.controles || []);
      setMotoristasDisponiveis(Array.from(new Set((resultado.controles || []).map((c: RelatorioControle) => c.motorista).filter(Boolean))).sort((a: string, b: string) => a.localeCompare(b)));
      setResumoTransportadoras(resultado.resumoTransportadoras || []);
      setResumoMotoristas(resultado.resumoMotoristas || []);
      setDadosGrafico(resultado.dadosGrafico || {
        transportadoras: { labels: [], controles: [], pallets: [] },
        timeline: { labels: [], controles: [] },
        status: { labels: [], valores: [] }
      });
      setTotais(resultado.totais || {
        totalControles: 0,
        controlesFinalizados: 0,
        controlesPendentes: 0,
        totalPalletsLevados: 0,
        totalPalletsDevolvidos: 0,
        totalNotas: 0,
        totalFretes: 0,
        totalFretesPagos: 0,
        totalFretesPendentes: 0
      });
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    buscarDados();
  };

  const getNomeTransportadora = (id: string) => {
    const transportadora = transportadoras.find(t => t.id === id);
    return transportadora ? transportadora.nome : id;
  };

  const getStatusColor = (status: string) => {
    return status === 'FINALIZADO' ? 'success' : 'warning';
  };

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return '-';
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const controlesPagaveis = controles.filter((controle) => controle.freteInformado && !controle.fretePago);

  const toggleControlePagamento = (controleId: string) => {
    setSelecionadosPagamento((atual) =>
      atual.includes(controleId)
        ? atual.filter((id) => id !== controleId)
        : [...atual, controleId]
    );
  };

  const selecionarTodosPendentes = () => {
    const pendentesIds = controlesPagaveis.map((controle) => controle.id);
    setSelecionadosPagamento((atual) =>
      atual.length === pendentesIds.length ? [] : pendentesIds
    );
  };

  const handleComprovanteChange = (file?: File) => {
    if (!file) {
      setComprovanteBase64('');
      setComprovanteNome('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setComprovanteBase64(String(reader.result || ''));
      setComprovanteNome(file.name);
    };
    reader.readAsDataURL(file);
  };

  const registrarPagamentoFrete = async () => {
    if (selecionadosPagamento.length === 0) return;

    try {
      setPagamentoSalvando(true);
      const response = await fetch('/api/fretes/pagamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          controleIds: selecionadosPagamento,
          comprovanteBase64: comprovanteBase64 || undefined,
          observacao: observacaoPagamento || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Erro ao registrar pagamento');
      }

      setPagamentoDialogOpen(false);
      setSelecionadosPagamento([]);
      setComprovanteBase64('');
      setComprovanteNome('');
      setObservacaoPagamento('');
      await buscarDados();
    } catch (error) {
      console.error('Erro ao registrar pagamento de frete:', error);
    } finally {
      setPagamentoSalvando(false);
    }
  };

  // Configurações dos gráficos
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const barChartData = {
    labels: dadosGrafico.transportadoras.labels.map(label => getNomeTransportadora(label)),
    datasets: [
      {
        label: 'Controles',
        data: dadosGrafico.transportadoras.controles,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        borderColor: 'rgba(53, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const lineChartData = {
    labels: dadosGrafico.timeline.labels.map(date => format(new Date(date), 'dd/MM')),
    datasets: [
      {
        label: 'Controles por Dia',
        data: dadosGrafico.timeline.controles,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const doughnutChartData = {
    labels: dadosGrafico.status.labels,
    datasets: [
      {
        data: dadosGrafico.status.valores,
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 206, 86, 0.8)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (!user) {
    return null;
  }

  return (
    <ProtectedRoute>
      <AppLayout
        title="Relatório de Controles de Carga"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Relatórios', href: '/relatorios' },
          { label: 'Controles de Carga' }
        ]}
      >
        <Box>
      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Filtros
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={2.4}>
            <TextField
              fullWidth
              label="Data Início"
              type="date"
              value={dataInicio ? format(dataInicio, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDataInicio(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2.4}>
            <TextField
              fullWidth
              label="Data Fim"
              type="date"
              value={dataFim ? format(dataFim, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDataFim(e.target.value ? new Date(e.target.value) : null)}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} md={2.4}>
            <FormControl fullWidth>
              <InputLabel>Transportadora</InputLabel>
              <Select
                value={transportadoraFiltro}
                label="Transportadora"
                onChange={(e) => setTransportadoraFiltro(e.target.value)}
              >
                {transportadoras.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFiltro}
                label="Status"
                onChange={(e) => setStatusFiltro(e.target.value)}
              >
                {statusOptions.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2.4}>
            <FormControl fullWidth>
              <InputLabel>Motorista</InputLabel>
              <Select
                value={motoristaFiltro}
                label="Motorista"
                onChange={(e) => setMotoristaFiltro(e.target.value)}
              >
                <MenuItem value="">Todos os motoristas</MenuItem>
                {motoristasDisponiveis.map((motorista) => (
                  <MenuItem key={motorista} value={motorista}>
                    {motorista}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button
              variant="contained"
              onClick={handleFiltrar}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Carregando...' : 'Filtrar'}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Cards de Resumo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Controles
              </Typography>
              <Typography variant="h4">
                {totais.totalControles}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Finalizados
              </Typography>
              <Typography variant="h4" color="success.main">
                {totais.controlesFinalizados}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pendentes
              </Typography>
              <Typography variant="h4" color="warning.main">
                {totais.controlesPendentes}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Notas
              </Typography>
              <Typography variant="h4">
                {totais.totalNotas}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Fretes
              </Typography>
              <Typography variant="h4">
                {formatCurrency(totais.totalFretes)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Fretes Pagos
              </Typography>
              <Typography variant="h4" color="success.main">
                {formatCurrency(totais.totalFretesPagos)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Fretes Pendentes
              </Typography>
              <Typography variant="h4" color="warning.main">
                {formatCurrency(totais.totalFretesPendentes)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Carteira de Fretes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selecione controles pendentes, anexe um comprovante único e marque-os como pagos.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  onClick={selecionarTodosPendentes}
                  disabled={controlesPagaveis.length === 0}
                >
                  {selecionadosPagamento.length === controlesPagaveis.length && controlesPagaveis.length > 0 ? 'Desmarcar pendentes' : 'Selecionar pendentes'}
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setPagamentoDialogOpen(true)}
                  disabled={selecionadosPagamento.length === 0}
                >
                  Registrar pagamento
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pallets Levados
              </Typography>
              <Typography variant="h4">
                {totais.totalPalletsLevados}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Pallets Devolvidos
              </Typography>
              <Typography variant="h4">
                {totais.totalPalletsDevolvidos}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Gráficos
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" align="center" gutterBottom>
              Controles por Transportadora
            </Typography>
            <Bar data={barChartData} options={chartOptions} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" align="center" gutterBottom>
              Timeline de Controles
            </Typography>
            <Line data={lineChartData} options={chartOptions} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" align="center" gutterBottom>
              Status dos Controles
            </Typography>
            <Doughnut data={doughnutChartData} options={chartOptions} />
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs para diferentes visualizações */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Resumo por Transportadora" />
            <Tab label="Resumo por Motorista" />
            <Tab label="Controles Detalhados" />
          </Tabs>
        </Box>

        {/* Tab 0: Resumo por Transportadora */}
        {tabValue === 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo por Transportadora
            </Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(241,245,249,0.5)' }}>
                  <TableRow sx={{ borderBottom: '1px solid #e2e8f0' }}>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Transportadora</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Controles</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Pallets Levados</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Pallets Devolvidos</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Diferença Pallets</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Fretes</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Total Notas</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>% Assinados</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resumoTransportadoras.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Chip
                          label={getNomeTransportadora(item.transportadora)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{item.totalControles}</TableCell>
                      <TableCell align="right">{item.totalPalletsLevados}</TableCell>
                      <TableCell align="right">{item.totalPalletsDevolvidos}</TableCell>
                      <TableCell align="right">
                        <strong style={{ 
                          color: item.totalPalletsDevolvidos > item.totalPalletsLevados ? 'green' : 'red' 
                        }}>
                          {item.totalPalletsDevolvidos > item.totalPalletsLevados ? '+' : '-'}{Math.abs(item.diferencaPallets)}
                        </strong>
                      </TableCell>
                      <TableCell align="right">{formatCurrency(item.totalFretes)}</TableCell>
                      <TableCell align="right">{item.totalNotas}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${item.percentualAssinados}%`}
                          size="small"
                          color={item.percentualAssinados >= 80 ? 'success' : item.percentualAssinados >= 50 ? 'warning' : 'error'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 1: Resumo por Motorista */}
        {tabValue === 1 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Resumo por Motorista
            </Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(241,245,249,0.5)' }}>
                  <TableRow sx={{ borderBottom: '1px solid #e2e8f0' }}>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Motorista</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Transportadora</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Controles</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Pallets Levados</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Pallets Devolvidos</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Diferença Pallets</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Total Notas</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Assinados</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resumoMotoristas.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{item.motorista}</TableCell>
                      <TableCell>
                        <Chip
                          label={getNomeTransportadora(item.transportadora)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">{item.totalControles}</TableCell>
                      <TableCell align="right">{item.totalPalletsLevados}</TableCell>
                      <TableCell align="right">{item.totalPalletsDevolvidos}</TableCell>
                      <TableCell align="right">
                        <strong style={{ 
                          color: item.totalPalletsDevolvidos > item.totalPalletsLevados ? 'green' : 'red' 
                        }}>
                          {item.totalPalletsDevolvidos > item.totalPalletsLevados ? '+' : '-'}{Math.abs(item.diferencaPallets)}
                        </strong>
                      </TableCell>
                      <TableCell align="right">{item.totalNotas}</TableCell>
                      <TableCell align="right">{item.controlesAssinados}/{item.totalControles}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Controles Detalhados */}
        {tabValue === 2 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Controles Detalhados
            </Typography>
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(241,245,249,0.5)' }}>
                  <TableRow sx={{ borderBottom: '1px solid #e2e8f0' }}>
                    <TableCell padding="checkbox" />
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Data/Hora</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Motorista</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Transportadora</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Pallets Levados</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Pallets Devolvidos</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Diferença</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Frete</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Pago?</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Notas</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Assinaturas</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {controles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center">
                        {loading ? 'Carregando dados...' : 'Nenhum controle encontrado para o período selecionado'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    controles.map((item, index) => (
                      <TableRow key={index} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selecionadosPagamento.includes(item.id)}
                            disabled={!item.freteInformado || item.fretePago}
                            onChange={() => toggleControlePagamento(item.id)}
                          />
                        </TableCell>
                        <TableCell>{format(new Date(item.dataCriacao), 'dd/MM/yyyy HH:mm:ss')}</TableCell>
                        <TableCell>{item.motorista}</TableCell>
                        <TableCell>
                          <Chip
                            label={getNomeTransportadora(item.transportadora)}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">{item.qtdPalletsLevados}</TableCell>
                        <TableCell align="right">{item.qtdPalletsDevolvidos}</TableCell>
                        <TableCell align="right">
                          <strong style={{ 
                            color: item.qtdPalletsDevolvidos > item.qtdPalletsLevados ? 'green' : 'red' 
                          }}>
                            {item.qtdPalletsDevolvidos > item.qtdPalletsLevados ? '+' : '-'}{Math.abs(item.diferencaPallets)}
                          </strong>
                        </TableCell>
                        <TableCell align="right">{item.freteInformado ? formatCurrency(item.valorFrete) : '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.fretePago ? 'Pago' : 'Pendente'}
                            color={item.fretePago ? 'success' : 'warning'}
                            size="small"
                          />
                          {item.fretePagoEm && (
                            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                              {format(new Date(item.fretePagoEm), 'dd/MM/yyyy HH:mm:ss')}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{item.totalNotas}</TableCell>
                        <TableCell>
                          <Chip
                            label={item.status}
                            size="small"
                            color={getStatusColor(item.status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Chip
                              label="M"
                              size="small"
                              color={item.assinaturaMotorista ? 'success' : 'default'}
                              variant={item.assinaturaMotorista ? 'filled' : 'outlined'}
                            />
                            <Chip
                              label="R"
                              size="small"
                              color={item.assinaturaResponsavel ? 'success' : 'default'}
                              variant={item.assinaturaResponsavel ? 'filled' : 'outlined'}
                            />
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      <Dialog open={pagamentoDialogOpen} onClose={() => setPagamentoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar pagamento de frete</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Você está prestes a marcar {selecionadosPagamento.length} controle(s) como pagos usando um comprovante único.
          </DialogContentText>
          <Alert severity="info" sx={{ mb: 2 }}>
            Total selecionado: {formatCurrency(
              controles
                .filter((controle) => selecionadosPagamento.includes(controle.id))
                .reduce((acc, controle) => acc + Number(controle.valorFrete || 0), 0)
            )}
          </Alert>
          <Button variant="outlined" component="label" sx={{ mb: 2 }}>
            {comprovanteNome ? 'Trocar comprovante' : 'Anexar comprovante'}
            <input
              hidden
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleComprovanteChange(e.target.files?.[0])}
            />
          </Button>
          {comprovanteNome && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Arquivo selecionado: {comprovanteNome}
            </Typography>
          )}
          <TextField
            fullWidth
            label="Observação"
            value={observacaoPagamento}
            onChange={(e) => setObservacaoPagamento(e.target.value)}
            multiline
            rows={3}
            placeholder="Ex.: pagamento realizado via PIX, depósito ou transferência"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setPagamentoDialogOpen(false)} variant="outlined">
            Cancelar
          </Button>
          <Button onClick={registrarPagamentoFrete} variant="contained" disabled={pagamentoSalvando}>
            {pagamentoSalvando ? 'Salvando...' : 'Confirmar pagamento'}
          </Button>
        </DialogActions>
      </Dialog>
</Box>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default RelatorioControlesCargaPage;
RelatorioControlesCargaPage.usesAppLayout = true;
