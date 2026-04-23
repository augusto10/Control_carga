import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AlertCircleIcon from '@mui/icons-material/ErrorOutline';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';

type ApiState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

type SswConsultaClientesResponse = any;
type SswConsultaCepResponse = any;
type SswConsultaPrazoResponse = any;

type DeliveryStatus =
  | 'EM_PREPARACAO'
  | 'ENVIADO_TRANSPORTADORA'
  | 'EM_ROTA_ENTREGA'
  | 'PEDIDO_ENTREGUE';

type DeliveryItem = {
  id: string;
  pedidoId: number;
  clienteId: number;
  clienteNome: string;
  cnpjCpf: string | null;
  vendedorNome: string;
  valor: number;
  dataHoraCadastro: string | null;
  numeroNota: string | null;
  identificacaoNfe: string | null;
  controleId: string | null;
  controleDataCriacao: string | null;
  controleTransportadora: string | null;
  status: DeliveryStatus;
  statusLabel: string;
  sswStatus: string | null;
  sswMensagem: string | null;
  observacaoStatus: string | null;
};

type DeliverySearchResponse = {
  data: DeliveryItem[];
};

const DELIVERY_STEPS: Array<{
  key: DeliveryStatus;
  label: string;
  icon: React.ReactElement;
}> = [
  {
    key: 'EM_PREPARACAO',
    label: 'Em preparacao',
    icon: <Inventory2OutlinedIcon />,
  },
  {
    key: 'ENVIADO_TRANSPORTADORA',
    label: 'Enviado para transportadora',
    icon: <LocalShippingOutlinedIcon />,
  },
  {
    key: 'EM_ROTA_ENTREGA',
    label: 'Em rota de entrega',
    icon: <RouteOutlinedIcon />,
  },
  {
    key: 'PEDIDO_ENTREGUE',
    label: 'Pedido entregue',
    icon: <CheckCircleOutlinedIcon />,
  },
];

const DELIVERY_STATUS_THEME = {
  EM_PREPARACAO: {
    accent: '#b45309',
    soft: '#fff7e6',
    line: '#f59e0b',
  },
  ENVIADO_TRANSPORTADORA: {
    accent: '#1d4ed8',
    soft: '#eff6ff',
    line: '#3b82f6',
  },
  EM_ROTA_ENTREGA: {
    accent: '#c2410c',
    soft: '#fff7ed',
    line: '#f97316',
  },
  PEDIDO_ENTREGUE: {
    accent: '#15803d',
    soft: '#f0fdf4',
    line: '#22c55e',
  },
} as const;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCurrency(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateTime(value: unknown): string {
  if (!value || typeof value !== 'string') return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('pt-BR');
}

function KeyValueTable({ rows }: { rows: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <Box sx={{ overflowX: 'auto', mt: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
      <Table size="small">
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell component="th" scope="row" sx={{ width: 220, fontWeight: 'bold' }}>
                {r.label}
              </TableCell>
              <TableCell>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function DeliveryStatusChip({ status }: { status: DeliveryStatus }) {
  const palette = DELIVERY_STATUS_THEME[status];
  const label = DELIVERY_STEPS.find((step) => step.key === status)?.label || status;

  return (
    <Chip
      label={label}
      sx={{
        fontWeight: 700,
        backgroundColor: palette.soft,
        color: palette.accent,
      }}
    />
  );
}

function DeliveryProgress({ status }: { status: DeliveryStatus }) {
  const activeStep = DELIVERY_STEPS.findIndex((step) => step.key === status);
  const activeTheme = DELIVERY_STATUS_THEME[status];

  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel
      sx={{
        mt: 1.5,
        mb: 1,
        '& .MuiStepConnector-line': {
          borderTopWidth: 4,
          borderColor: 'rgba(148, 163, 184, 0.45)',
        },
        '& .Mui-completed .MuiStepConnector-line': {
          borderColor: activeTheme.line,
        },
      }}
    >
      {DELIVERY_STEPS.map((step, index) => (
        <Step key={step.key} completed={index <= activeStep}>
          <StepLabel
            icon={
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '3px solid',
                  borderColor:
                    index === activeStep
                      ? DELIVERY_STATUS_THEME[step.key].line
                      : index < activeStep
                        ? DELIVERY_STATUS_THEME[step.key].line
                        : 'rgba(148, 163, 184, 0.35)',
                  backgroundColor:
                    index === activeStep
                      ? DELIVERY_STATUS_THEME[step.key].soft
                      : index < activeStep
                        ? 'rgba(255,255,255,0.98)'
                        : 'rgba(241, 245, 249, 0.9)',
                  color:
                    index === activeStep
                      ? DELIVERY_STATUS_THEME[step.key].accent
                      : index < activeStep
                        ? DELIVERY_STATUS_THEME[step.key].accent
                        : '#94a3b8',
                  boxShadow:
                    index === activeStep
                      ? `0 0 0 6px ${DELIVERY_STATUS_THEME[step.key].soft}`
                      : 'none',
                  transition: 'all 160ms ease',
                }}
              >
                {step.icon}
              </Box>
            }
            sx={{
              '& .MuiStepLabel-label': {
                mt: 1,
                fontWeight: index === activeStep ? 800 : index < activeStep ? 700 : 500,
                color:
                  index === activeStep
                    ? `${DELIVERY_STATUS_THEME[step.key].accent} !important`
                    : index < activeStep
                      ? '#0f172a !important'
                      : '#64748b !important',
              },
            }}
          >
            {step.label}
          </StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}

function DeliveryResultCard({ item }: { item: DeliveryItem }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 3,
        mt: 2,
        borderColor: 'rgba(15, 23, 42, 0.08)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Pedido #{item.pedidoId}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {item.clienteNome}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <DeliveryStatusChip status={item.status} />
          <Chip
            label={formatCurrency(item.valor)}
            sx={{ fontWeight: 700, backgroundColor: 'rgba(22, 163, 74, 0.12)', color: '#166534' }}
          />
        </Box>
      </Box>

      <DeliveryProgress status={item.status} />

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6}>
          <Typography variant="body2"><strong>Cliente:</strong> {item.clienteNome}</Typography>
          <Typography variant="body2"><strong>CNPJ/CPF:</strong> {item.cnpjCpf || '-'}</Typography>
          <Typography variant="body2"><strong>Representante:</strong> {item.vendedorNome}</Typography>
          <Typography variant="body2"><strong>Data do pedido:</strong> {formatDateTime(item.dataHoraCadastro)}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="body2"><strong>Numero da NF:</strong> {item.numeroNota || '-'}</Typography>
          <Typography variant="body2"><strong>Chave NF-e:</strong> {item.identificacaoNfe || '-'}</Typography>
          <Typography variant="body2"><strong>Transportadora:</strong> {item.controleTransportadora || '-'}</Typography>
          <Typography variant="body2"><strong>Data do controle:</strong> {formatDateTime(item.controleDataCriacao)}</Typography>
        </Grid>
      </Grid>

      {(item.sswMensagem || item.observacaoStatus) && (
        <Box
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: 'rgba(15, 23, 42, 0.04)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          {item.sswMensagem && (
            <Typography variant="body2">
              <strong>SSW:</strong> {item.sswMensagem}
            </Typography>
          )}
          {item.sswStatus && (
            <Typography variant="body2">
              <strong>Status SSW:</strong> {item.sswStatus}
            </Typography>
          )}
          {item.observacaoStatus && (
            <Typography variant="body2">
              <strong>Fluxo:</strong> {item.observacaoStatus}
            </Typography>
          )}
        </Box>
      )}
    </Paper>
  );
}

export default function SswPainelPage() {
  const [tabIndex, setTabIndex] = useState(0);

  const [clienteCnpj, setClienteCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [prazoCepRem, setPrazoCepRem] = useState('');
  const [prazoCepDest, setPrazoCepDest] = useState('');
  const [prazoTpFrete, setPrazoTpFrete] = useState('');
  const [prazoCodMerc, setPrazoCodMerc] = useState('');
  const [pedidoBusca, setPedidoBusca] = useState('');
  const [cnpjBusca, setCnpjBusca] = useState('');

  const [clienteState, setClienteState] = useState<ApiState<SswConsultaClientesResponse>>({
    loading: false,
    error: null,
    data: null,
  });
  const [cepState, setCepState] = useState<ApiState<SswConsultaCepResponse>>({
    loading: false,
    error: null,
    data: null,
  });
  const [prazoState, setPrazoState] = useState<ApiState<SswConsultaPrazoResponse>>({
    loading: false,
    error: null,
    data: null,
  });
  const [deliveryState, setDeliveryState] = useState<ApiState<DeliverySearchResponse>>({
    loading: false,
    error: null,
    data: null,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  async function safeFetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, { method: 'GET' });
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      const message = json?.error || 'Falha na consulta';
      throw new Error(message);
    }
    return json as T;
  }

  const onConsultarCliente = async () => {
    const idCliente = onlyDigits(clienteCnpj);
    if (idCliente.length !== 11 && idCliente.length !== 14) {
      setClienteState({ loading: false, error: 'Informe um CPF/CNPJ valido (somente numeros).', data: null });
      return;
    }

    setClienteState({ loading: true, error: null, data: null });
    try {
      const url = `/api/ssw_accert/consulta-clientes?idCliente=${encodeURIComponent(idCliente)}`;
      const data = await safeFetchJson<SswConsultaClientesResponse>(url);
      setClienteState({ loading: false, error: null, data });
    } catch (e) {
      setClienteState({ loading: false, error: e instanceof Error ? e.message : 'Erro ao consultar cliente', data: null });
    }
  };

  const onConsultarCep = async () => {
    const idCep = onlyDigits(cep);
    if (idCep.length !== 8) {
      setCepState({ loading: false, error: 'Informe um CEP valido (8 digitos).', data: null });
      return;
    }

    setCepState({ loading: true, error: null, data: null });
    try {
      const url = `/api/ssw_accert/consulta-cep?idCep=${encodeURIComponent(idCep)}`;
      const data = await safeFetchJson<SswConsultaCepResponse>(url);
      setCepState({ loading: false, error: null, data });
    } catch (e) {
      setCepState({ loading: false, error: e instanceof Error ? e.message : 'Erro ao consultar CEP', data: null });
    }
  };

  const onConsultarPrazo = async () => {
    const idCepRemetente = onlyDigits(prazoCepRem);
    const idCepDestinatario = onlyDigits(prazoCepDest);

    if (idCepRemetente.length !== 8 || idCepDestinatario.length !== 8) {
      setPrazoState({ loading: false, error: 'Informe CEP remetente e destinatario com 8 digitos.', data: null });
      return;
    }

    const params = new URLSearchParams();
    params.set('idCepRemetente', idCepRemetente);
    params.set('idCepDestinatario', idCepDestinatario);
    if (prazoTpFrete.trim()) params.set('tpFrete', prazoTpFrete.trim());
    if (prazoCodMerc.trim()) params.set('idCodigoMercadoria', prazoCodMerc.trim());

    setPrazoState({ loading: true, error: null, data: null });
    try {
      const url = `/api/ssw_accert/consulta-prazo?${params.toString()}`;
      const data = await safeFetchJson<SswConsultaPrazoResponse>(url);
      setPrazoState({ loading: false, error: null, data });
    } catch (e) {
      setPrazoState({ loading: false, error: e instanceof Error ? e.message : 'Erro ao consultar prazo', data: null });
    }
  };

  const onConsultarEntrega = async () => {
    const pedido = pedidoBusca.trim();
    const cnpj = onlyDigits(cnpjBusca);

    if (!pedido && !cnpj) {
      setDeliveryState({
        loading: false,
        error: 'Informe um numero de pedido ou CNPJ para consultar a entrega.',
        data: null,
      });
      return;
    }

    setDeliveryState({ loading: true, error: null, data: null });

    try {
      const params = new URLSearchParams();
      if (pedido) params.set('pedido', pedido);
      if (!pedido && cnpj) params.set('cnpj', cnpj);

      const data = await safeFetchJson<DeliverySearchResponse>(
        `/api/ssw_accert/consultar-entrega?${params.toString()}`
      );

      setDeliveryState({ loading: false, error: null, data });
    } catch (e) {
      setDeliveryState({
        loading: false,
        error: e instanceof Error ? e.message : 'Erro ao consultar entrega',
        data: null,
      });
    }
  };

  const clienteRows = useMemo(() => {
    const d = clienteState.data;
    if (!d) return null;
    const emails = Array.isArray(d.emails)
      ? d.emails.map((e: any) => (typeof e === 'string' ? e : e.email ?? '')).filter(Boolean)
      : [];
    return [
      { label: 'Nome', value: d.nome || '-' },
      { label: 'Endereco', value: d.endereco || '-' },
      { label: 'Numero', value: d.numero || '-' },
      { label: 'Complemento', value: d.complemento || '-' },
      { label: 'Bairro', value: d.bairro || '-' },
      { label: 'CEP', value: d.cep || '-' },
      { label: 'Cidade/UF', value: `${d.cidade || '-'} / ${d.uf || '-'}` },
      { label: 'Transportar', value: d.transportar ? <Chip label={String(d.transportar)} size="small" /> : '-' },
      { label: 'Prazo Pgto (dias)', value: d.prazoPgto ?? '-' },
      { label: 'Tipo Cobranca', value: d.tipoCobranca || '-' },
      { label: 'Ultimo Movimento', value: d.dataUltMvto || '-' },
      { label: 'Telefone', value: d.telefone || '-' },
      { label: 'Celular', value: d.celular || '-' },
      { label: 'Emails', value: emails.length ? emails.join(', ') : '-' },
    ];
  }, [clienteState.data]);

  const cepRows = useMemo(() => {
    const d = cepState.data;
    if (!d) return null;
    return [
      { label: 'Cidade', value: d.cidade || '-' },
      { label: 'CEP Cidade', value: d.cepCidade || '-' },
      { label: 'Unidade', value: d.unidade || '-' },
    ];
  }, [cepState.data]);

  const prazoRows = useMemo(() => {
    const d = prazoState.data;
    if (!d) return null;
    return [
      { label: 'CEP Remetente', value: d.idCepRemetente || '-' },
      { label: 'CEP Destinatario', value: d.idCepDestinatario || '-' },
      { label: 'Qtde Dias', value: d.qtdeDias ?? '-' },
      { label: 'Data Prevista', value: d.dataPrevista || '-' },
      { label: 'Tipo Frete', value: d.tpFrete || '-' },
      { label: 'Codigo Mercadoria', value: d.idCodigoMercadoria ?? '-' },
    ];
  }, [prazoState.data]);

  const deliveryItems = deliveryState.data?.data || [];

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardHeader
          title="Rastrear pedidos entrega"
          action={<SearchIcon sx={{ mt: 1, mr: 1, color: 'text.secondary' }} />}
        />
        <Divider />
        <CardContent>
          <Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ mb: 3 }}>
            <Tab label="Consultar pedidos" />
            <Tab label="Cliente (CNPJ/CPF)" />
            <Tab label="CEP" />
            <Tab label="Prazo" />
          </Tabs>

          {tabIndex === 0 && (
            <Box>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    label="Numero do pedido"
                    value={pedidoBusca}
                    onChange={(e) => setPedidoBusca(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    label="CNPJ do cliente"
                    value={cnpjBusca}
                    onChange={(e) => setCnpjBusca(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button variant="contained" fullWidth onClick={onConsultarEntrega} disabled={deliveryState.loading}>
                    {deliveryState.loading ? <CircularProgress size={24} /> : 'Consultar pedidos'}
                  </Button>
                </Grid>
              </Grid>

              {deliveryState.error && (
                <Alert severity="error" sx={{ mt: 2 }} icon={<AlertCircleIcon />}>
                  {deliveryState.error}
                </Alert>
              )}

              {!deliveryState.loading && !deliveryState.error && deliveryState.data && deliveryItems.length === 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Nenhum pedido encontrado para os filtros informados.
                </Alert>
              )}

              {deliveryItems.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {deliveryItems.length} pedido{deliveryItems.length === 1 ? '' : 's'} encontrado{deliveryItems.length === 1 ? '' : 's'}
                  </Typography>
                  {deliveryItems.map((item) => (
                    <DeliveryResultCard key={item.id} item={item} />
                  ))}
                </Box>
              )}
            </Box>
          )}

          {tabIndex === 1 && (
            <Box>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={8}>
                  <TextField fullWidth label="CNPJ/CPF" value={clienteCnpj} onChange={(e) => setClienteCnpj(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button variant="contained" fullWidth onClick={onConsultarCliente} disabled={clienteState.loading}>
                    {clienteState.loading ? <CircularProgress size={24} /> : 'Consultar'}
                  </Button>
                </Grid>
              </Grid>
              {clienteState.error && (
                <Alert severity="error" sx={{ mt: 2 }} icon={<AlertCircleIcon />}>
                  {clienteState.error}
                </Alert>
              )}
              {clienteRows && <KeyValueTable rows={clienteRows} />}
            </Box>
          )}

          {tabIndex === 2 && (
            <Box>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={8}>
                  <TextField fullWidth label="CEP" value={cep} onChange={(e) => setCep(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button variant="contained" fullWidth onClick={onConsultarCep} disabled={cepState.loading}>
                    {cepState.loading ? <CircularProgress size={24} /> : 'Consultar'}
                  </Button>
                </Grid>
              </Grid>
              {cepState.error && (
                <Alert severity="error" sx={{ mt: 2 }} icon={<AlertCircleIcon />}>
                  {cepState.error}
                </Alert>
              )}
              {cepRows && <KeyValueTable rows={cepRows} />}
            </Box>
          )}

          {tabIndex === 3 && (
            <Box>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="CEP Remetente" value={prazoCepRem} onChange={(e) => setPrazoCepRem(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="CEP Destinatario" value={prazoCepDest} onChange={(e) => setPrazoCepDest(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Tipo Frete" value={prazoTpFrete} onChange={(e) => setPrazoTpFrete(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Cod. Mercadoria" value={prazoCodMerc} onChange={(e) => setPrazoCodMerc(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12}>
                  <Button variant="contained" onClick={onConsultarPrazo} disabled={prazoState.loading}>
                    {prazoState.loading ? <CircularProgress size={24} /> : 'Consultar Prazo'}
                  </Button>
                </Grid>
              </Grid>
              {prazoState.error && (
                <Alert severity="error" sx={{ mt: 2 }} icon={<AlertCircleIcon />}>
                  {prazoState.error}
                </Alert>
              )}
              {prazoRows && <KeyValueTable rows={prazoRows} />}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

SswPainelPage.usesAppLayout = false;
SswPainelPage.pageTitle = 'Rastrear pedidos entrega';
