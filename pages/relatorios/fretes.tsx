import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Checkbox,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  useTheme,
  alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PaymentsIcon from '@mui/icons-material/Payments';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import SearchIcon from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PersonIcon from '@mui/icons-material/Person';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useRouter } from 'next/router';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

interface FreteControle {
  id: string;
  motorista: string;
  transportadora: string;
  dataCriacao: string;
  freteInformado: boolean;
  valorFrete?: number | null;
  fretePago: boolean;
  fretePagoEm?: string | null;
  fretePagamentoId?: string | null;
}

interface FretePagamentoItem {
  valorFrete: number;
  controle: {
    id: string;
    motorista: string;
    transportadora: string;
    dataCriacao: string;
    valorFrete?: number | null;
    fretePagoEm?: string | null;
  };
}

interface FretePagamento {
  id: string;
  valorTotal: number;
  comprovante?: string | null;
  observacao?: string | null;
  dataPagamento: string;
  criadoPorUser?: {
    id: string;
    nome: string;
    email: string;
  } | null;
  controles: FretePagamentoItem[];
}

interface CarteiraFrete {
  totalPlanejado: number;
  totalPago: number;
  totalPendente: number;
  totalControles: number;
  totalPagos: number;
  totalPendentes: number;
}

const formatCurrency = (value?: number | null) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return format(new Date(value), 'dd/MM/yyyy HH:mm:ss');
};

export default function FretesPage() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [controles, setControles] = useState<FreteControle[]>([]);
  const [pagamentos, setPagamentos] = useState<FretePagamento[]>([]);
  const [carteira, setCarteira] = useState<CarteiraFrete>({
    totalPlanejado: 0,
    totalPago: 0,
    totalPendente: 0,
    totalControles: 0,
    totalPagos: 0,
    totalPendentes: 0,
  });

  const [dataInicio, setDataInicio] = useState<Date | null>(startOfMonth(new Date()));
  const [dataFim, setDataFim] = useState<Date | null>(endOfMonth(new Date()));
  const [motoristaFiltro, setMotoristaFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<'TODOS' | 'PAGO' | 'PENDENTE'>('TODOS');
  const [motoristasDisponiveis, setMotoristasDisponiveis] = useState<string[]>([]);
  const [expandedPagamento, setExpandedPagamento] = useState<string | false>(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [pagamentoSalvando, setPagamentoSalvando] = useState(false);
  const [comprovanteBase64, setComprovanteBase64] = useState('');
  const [comprovanteNome, setComprovanteNome] = useState('');
  const [observacaoPagamento, setObservacaoPagamento] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    buscarDados();
  }, [user, router]);

  const buscarDados = async () => {
    setLoading(true);
    setSelecionados([]);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('dataInicio', format(dataInicio, 'yyyy-MM-dd'));
      if (dataFim) params.append('dataFim', format(dataFim, 'yyyy-MM-dd'));
      if (motoristaFiltro.trim()) params.append('motorista', motoristaFiltro.trim());
      if (statusFiltro !== 'TODOS') params.append('status', statusFiltro);

      const response = await fetch(`/api/fretes/pagamentos?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar a carteira de fretes');
      }

      const resultado = await response.json();
      setControles(resultado.controles || []);
      setPagamentos(resultado.pagamentos || []);
      setCarteira(
        resultado.carteira || {
          totalPlanejado: 0,
          totalPago: 0,
          totalPendente: 0,
          totalControles: 0,
          totalPagos: 0,
          totalPendentes: 0,
        }
      );

      const nomesMotoristas = Array.from(
        new Set((resultado.controles || []).map((controle: FreteControle) => controle.motorista).filter(Boolean))
      ).sort((a: string, b: string) => a.localeCompare(b));
      setMotoristasDisponiveis(nomesMotoristas);
    } catch (error) {
      console.error('Erro ao carregar fretes:', error);
    } finally {
      setLoading(false);
    }
  };

  const controlesFiltrados = controles;
  const controlesPendentes = controlesFiltrados.filter((controle) => !controle.fretePago);
  const controlesSelecionados = controlesPendentes.filter((controle) => selecionados.includes(controle.id));
  const valorSelecionado = controlesSelecionados.reduce((acc, controle) => acc + Number(controle.valorFrete || 0), 0);

  const selecionarTodosPendentes = () => {
    if (selecionados.length === controlesPendentes.length) {
      setSelecionados([]);
      return;
    }
    setSelecionados(controlesPendentes.map((controle) => controle.id));
  };

  const alternarSelecao = (controleId: string) => {
    setSelecionados((atual) =>
      atual.includes(controleId) ? atual.filter((id) => id !== controleId) : [...atual, controleId]
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

  const registrarPagamento = async () => {
    if (selecionados.length === 0) return;

    try {
      setPagamentoSalvando(true);
      const response = await fetch('/api/fretes/pagamentos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          controleIds: selecionados,
          comprovanteBase64: comprovanteBase64 || undefined,
          observacao: observacaoPagamento || undefined,
          dataPagamento: new Date().toISOString(),
        }),
      });

      const resultado = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(resultado.message || 'Erro ao registrar pagamento');
      }

      setPagamentoDialogOpen(false);
      setComprovanteBase64('');
      setComprovanteNome('');
      setObservacaoPagamento('');
      setSelecionados([]);
      await buscarDados();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      alert(error instanceof Error ? error.message : 'Erro ao registrar pagamento');
    } finally {
      setPagamentoSalvando(false);
    }
  };

  const abrirComprovante = (comprovante?: string | null) => {
    if (!comprovante) return;
    window.open(comprovante, '_blank', 'noopener,noreferrer');
  };

  const baixarComprovante = (pagamento: FretePagamento) => {
    if (!pagamento.comprovante) return;
    const link = document.createElement('a');
    link.href = pagamento.comprovante;
    link.download = `comprovante-frete-${pagamento.id}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  const limparFiltros = () => {
    setDataInicio(startOfMonth(new Date()));
    setDataFim(endOfMonth(new Date()));
    setMotoristaFiltro('');
    setStatusFiltro('TODOS');
  };

  const aplicarFiltros = () => buscarDados();

  const cardStyles = (color: 'primary' | 'success' | 'warning' | 'info') => ({
    height: '100%',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(10px)',
    border: `1px solid ${alpha(theme.palette[color].main, 0.18)}`,
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
  });

  return (
    <ProtectedRoute>
      <AppLayout
        title="Fretes"
        subtitle="Histórico de lotes pagos, comprovantes e carteira de fretes terceirizados"
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Relatórios', path: '/relatorios' },
          { label: 'Fretes' },
        ]}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Card sx={cardStyles('info')}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.12), color: 'info.main' }}>
                    <AccountBalanceWalletIcon />
                  </Avatar>
                  <Chip label="Carteira" color="info" size="small" />
                </Stack>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 2 }}>
                  {formatCurrency(carteira.totalPlanejado)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total planejado de fretes informados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={cardStyles('success')}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.12), color: 'success.main' }}>
                    <PaymentsIcon />
                  </Avatar>
                  <Chip label="Pago" color="success" size="small" />
                </Stack>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 2 }}>
                  {formatCurrency(carteira.totalPago)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fretes já confirmados como pagos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={cardStyles('warning')}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.12), color: 'warning.main' }}>
                    <PendingActionsIcon />
                  </Avatar>
                  <Chip label="Pendente" color="warning" size="small" />
                </Stack>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 2 }}>
                  {formatCurrency(carteira.totalPendente)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fretes ainda sem baixa de pagamento
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={cardStyles('primary')}>
              <CardContent>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
                    <ReceiptLongIcon />
                  </Avatar>
                  <Chip label="Lotes" color="primary" size="small" />
                </Stack>
                <Typography variant="h5" fontWeight={800} sx={{ mt: 2 }}>
                  {carteira.totalControles}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Controles com frete lançado no período
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.9)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' }}>
                    <FilterAltIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      Filtros da carteira
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Filtre por período, motorista e situação do frete
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  <Button variant="outlined" href="/relatorios/controles-carga">
                    Ir para controles
                  </Button>
                  <Button variant="contained" startIcon={<SearchIcon />} onClick={aplicarFiltros} disabled={loading}>
                    {loading ? 'Carregando...' : 'Atualizar'}
                  </Button>
                </Stack>
              </Stack>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Data inicial"
                    type="date"
                    value={dataInicio ? format(dataInicio, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setDataInicio(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Data final"
                    type="date"
                    value={dataFim ? format(dataFim, 'yyyy-MM-dd') : ''}
                    onChange={(e) => setDataFim(e.target.value ? new Date(`${e.target.value}T00:00:00`) : null)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Motorista</InputLabel>
                    <Select
                      value={motoristaFiltro}
                      label="Motorista"
                      onChange={(e) => setMotoristaFiltro(e.target.value)}
                    >
                      <MenuItem value="">
                        <em>Todos os motoristas</em>
                      </MenuItem>
                      {motoristasDisponiveis.map((motorista) => (
                        <MenuItem key={motorista} value={motorista}>
                          {motorista}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Situação</InputLabel>
                    <Select
                      value={statusFiltro}
                      label="Situação"
                      onChange={(e) => setStatusFiltro(e.target.value as 'TODOS' | 'PAGO' | 'PENDENTE')}
                    >
                      <MenuItem value="TODOS">Todos</MenuItem>
                      <MenuItem value="PAGO">Pagos</MenuItem>
                      <MenuItem value="PENDENTE">Pendentes</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1.5}>
                    <Button variant="outlined" onClick={limparFiltros}>
                      Limpar filtros
                    </Button>
                    <Button variant="contained" onClick={aplicarFiltros} disabled={loading}>
                      Aplicar filtros
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.96)',
                border: `1px solid ${alpha(theme.palette.warning.main, 0.14)}`,
              }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Fretes pendentes de pagamento
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Selecione um ou vários fretes para marcar como pagos e anexar um comprovante único.
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button variant="outlined" onClick={selecionarTodosPendentes} disabled={controlesPendentes.length === 0}>
                    {selecionados.length === controlesPendentes.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => setPagamentoDialogOpen(true)}
                    disabled={selecionados.length === 0}
                  >
                    Marcar como pago
                  </Button>
                </Stack>
              </Stack>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={controlesPendentes.length > 0 && selecionados.length === controlesPendentes.length}
                          indeterminate={selecionados.length > 0 && selecionados.length < controlesPendentes.length}
                          onChange={() => selecionarTodosPendentes()}
                          disabled={controlesPendentes.length === 0}
                        />
                      </TableCell>
                      <TableCell>Motorista</TableCell>
                      <TableCell>Transportadora</TableCell>
                      <TableCell>Data/Hora</TableCell>
                      <TableCell align="right">Valor</TableCell>
                      <TableCell align="center">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {controlesPendentes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          Nenhum frete pendente encontrado no período selecionado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      controlesPendentes.map((controle) => (
                        <TableRow key={controle.id} hover selected={selecionados.includes(controle.id)}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selecionados.includes(controle.id)}
                              onChange={() => alternarSelecao(controle.id)}
                            />
                          </TableCell>
                          <TableCell>{controle.motorista}</TableCell>
                          <TableCell>{controle.transportadora}</TableCell>
                          <TableCell>{formatDateTime(controle.dataCriacao)}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCurrency(controle.valorFrete)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip size="small" label="Pendente" color="warning" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Selecionados: <strong>{selecionados.length}</strong> | Valor total: <strong>{formatCurrency(valorSelecionado)}</strong>
                </Typography>
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => setPagamentoDialogOpen(true)}
                  disabled={selecionados.length === 0}
                >
                  Informar pagamento
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={7}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.95)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Carteira de fretes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Controles com frete lançado no período selecionado
                  </Typography>
                </Box>
                <Chip
                  icon={<LocalShippingIcon />}
                  label={`${controlesFiltrados.length} controle(s)`}
                  variant="outlined"
                />
              </Stack>

              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Motorista</TableCell>
                      <TableCell>Transportadora</TableCell>
                      <TableCell>Data/Hora</TableCell>
                      <TableCell align="right">Frete</TableCell>
                      <TableCell align="center">Situação</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : controlesFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          Nenhum frete encontrado para os filtros selecionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      controlesFiltrados.map((controle) => (
                        <TableRow key={controle.id} hover>
                          <TableCell>{controle.motorista}</TableCell>
                          <TableCell>{controle.transportadora}</TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant="body2">{formatDateTime(controle.dataCriacao)}</Typography>
                              {controle.fretePagoEm && (
                                <Typography variant="caption" color="text.secondary">
                                  Pago em {formatDateTime(controle.fretePagoEm)}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {controle.freteInformado ? formatCurrency(controle.valorFrete) : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={controle.fretePago ? 'Pago' : 'Pendente'}
                              color={controle.fretePago ? 'success' : 'warning'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 3 }} />
            </Paper>
          </Grid>

          <Grid item xs={12} lg={5}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 4,
                background: 'rgba(255,255,255,0.95)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight={800}>
                    Histórico de lotes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pagamentos já registrados com comprovante e observação
                  </Typography>
                </Box>
                <Chip
                  icon={<ReceiptLongIcon />}
                  label={`${pagamentos.length} lote(s)`}
                  color="primary"
                  variant="outlined"
                />
              </Stack>

              <Stack spacing={1.5}>
                {loading ? (
                  <Paper sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Carregando histórico...
                    </Typography>
                  </Paper>
                ) : pagamentos.length === 0 ? (
                  <Paper sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhum lote de frete encontrado para o período selecionado.
                    </Typography>
                  </Paper>
                ) : (
                  pagamentos.map((pagamento) => (
                    <Accordion
                      key={pagamento.id}
                      expanded={expandedPagamento === pagamento.id}
                      onChange={(_, expanded) => setExpandedPagamento(expanded ? pagamento.id : false)}
                      sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: 'none',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                        '&:before': { display: 'none' },
                      }}
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Stack spacing={0.5} sx={{ width: '100%', pr: 2 }}>
                          <Stack direction="row" alignItems="center" spacing={1} justifyContent="space-between">
                            <Typography variant="subtitle2" fontWeight={800}>
                              {formatDateTime(pagamento.dataPagamento)}
                            </Typography>
                            <Chip size="small" color="success" label="Pago" />
                          </Stack>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip size="small" label={formatCurrency(pagamento.valorTotal)} variant="outlined" />
                            <Chip size="small" label={`${pagamento.controles.length} controle(s)`} variant="outlined" />
                            {pagamento.criadoPorUser?.nome && (
                              <Chip
                                size="small"
                                icon={<PersonIcon />}
                                label={pagamento.criadoPorUser.nome}
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Stack>
                      </AccordionSummary>
                      <AccordionDetails sx={{ pt: 0 }}>
                        <Stack spacing={1.5}>
                          {pagamento.observacao && (
                            <Alert severity="info" variant="outlined">
                              {pagamento.observacao}
                            </Alert>
                          )}

                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {pagamento.comprovante && (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<OpenInNewIcon />}
                                  onClick={() => abrirComprovante(pagamento.comprovante)}
                                >
                                  Ver comprovante
                                </Button>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => baixarComprovante(pagamento)}
                                >
                                  Baixar comprovante
                                </Button>
                              </>
                            )}
                          </Stack>

                          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Motorista</TableCell>
                                  <TableCell>Transportadora</TableCell>
                                  <TableCell align="right">Valor</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {pagamento.controles.map((item) => (
                                  <TableRow key={item.controle.id}>
                                    <TableCell>
                                      <Stack spacing={0.3}>
                                        <Typography variant="body2" fontWeight={700}>
                                          {item.controle.motorista}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {formatDateTime(item.controle.dataCriacao)}
                                        </Typography>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>{item.controle.transportadora}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                                      {formatCurrency(item.valorFrete)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))
                )}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        <Dialog open={pagamentoDialogOpen} onClose={() => setPagamentoDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Confirmar pagamento dos fretes</DialogTitle>
          <DialogContent dividers>
            <DialogContentText sx={{ mb: 2 }}>
              Você está prestes a marcar {selecionados.length} frete(s) como pago(s), no total de {formatCurrency(valorSelecionado)}.
            </DialogContentText>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="Observação"
                value={observacaoPagamento}
                onChange={(e) => setObservacaoPagamento(e.target.value)}
                multiline
                minRows={3}
                placeholder="Ex.: Pagamento realizado via transferência"
              />
              <Box>
                <Button variant="outlined" component="label">
                  {comprovanteNome ? 'Trocar comprovante' : 'Adicionar comprovante'}
                  <input
                    hidden
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleComprovanteChange(e.target.files?.[0])}
                  />
                </Button>
                {comprovanteNome && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Arquivo selecionado: {comprovanteNome}
                  </Typography>
                )}
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPagamentoDialogOpen(false)} disabled={pagamentoSalvando}>
              Cancelar
            </Button>
            <Button
              onClick={registrarPagamento}
              variant="contained"
              color="success"
              disabled={pagamentoSalvando || selecionados.length === 0}
            >
              {pagamentoSalvando ? 'Salvando...' : 'Confirmar pagamento'}
            </Button>
          </DialogActions>
        </Dialog>
      </AppLayout>
    </ProtectedRoute>
  );
}

(FretesPage as any).usesAppLayout = true;
