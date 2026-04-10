import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Chip,
  Grid,
  CircularProgress,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AlertCircleIcon from '@mui/icons-material/ErrorOutline';

type ApiState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
};

// Types
type SswConsultaClientesResponse = any;
type SswConsultaCepResponse = any;
type SswConsultaPrazoResponse = any;
type SantriNotaFiscal = any;
type SantriNotasFiscaisResponse = any;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function formatCurrency(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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

export default function SswPainelPage() {
  const [tabIndex, setTabIndex] = useState(0);

  // States
  const [clienteCnpj, setClienteCnpj] = useState('');
  const [cep, setCep] = useState('');
  const [prazoCepRem, setPrazoCepRem] = useState('');
  const [prazoCepDest, setPrazoCepDest] = useState('');
  const [prazoTpFrete, setPrazoTpFrete] = useState('');
  const [prazoCodMerc, setPrazoCodMerc] = useState('');
  const [nfChaveNfe, setNfChaveNfe] = useState('');

  const [clienteState, setClienteState] = useState<ApiState<SswConsultaClientesResponse>>({ loading: false, error: null, data: null });
  const [cepState, setCepState] = useState<ApiState<SswConsultaCepResponse>>({ loading: false, error: null, data: null });
  const [prazoState, setPrazoState] = useState<ApiState<SswConsultaPrazoResponse>>({ loading: false, error: null, data: null });
  const [trackingState, setTrackingState] = useState<ApiState<Record<string, unknown>>>({ loading: false, error: null, data: null });

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

  async function safePostJson<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

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
      setClienteState({ loading: false, error: 'Informe um CPF/CNPJ válido (somente números).', data: null });
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
      setCepState({ loading: false, error: 'Informe um CEP válido (8 dígitos).', data: null });
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
      setPrazoState({ loading: false, error: 'Informe CEP remetente e destinatário com 8 dígitos.', data: null });
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

  const onConsultarTrackingDanfe = async () => {
    const chave = onlyDigits(nfChaveNfe);
    if (chave.length !== 44) {
      setTrackingState({ loading: false, error: 'Informe a chave da NF-e (44 dígitos).', data: null });
      return;
    }

    setTrackingState({ loading: true, error: null, data: null });
    try {
      const data = await safePostJson<Record<string, unknown>>('/api/ssw_accert/tracking-danfe', { chave_nfe: chave });
      setTrackingState({ loading: false, error: null, data });
    } catch (e) {
      setTrackingState({ loading: false, error: e instanceof Error ? e.message : 'Erro ao consultar tracking DANFE', data: null });
    }
  };

  // Memoized Rows
  const clienteRows = useMemo(() => {
    const d = clienteState.data;
    if (!d) return null;
    const emails = Array.isArray(d.emails) ? d.emails.map((e: any) => (typeof e === 'string' ? e : (e.email ?? ''))).filter(Boolean) : [];
    return [
      { label: 'Nome', value: d.nome || '-' },
      { label: 'Endereço', value: d.endereco || '-' },
      { label: 'Número', value: d.numero || '-' },
      { label: 'Complemento', value: d.complemento || '-' },
      { label: 'Bairro', value: d.bairro || '-' },
      { label: 'CEP', value: d.cep || '-' },
      { label: 'Cidade/UF', value: `${d.cidade || '-'} / ${d.uf || '-'}` },
      { label: 'Transportar', value: d.transportar ? <Chip label={String(d.transportar)} size="small" /> : '-' },
      { label: 'Prazo Pgto (dias)', value: d.prazoPgto ?? '-' },
      { label: 'Tipo Cobrança', value: d.tipoCobranca || '-' },
      { label: 'Último Movimento', value: d.dataUltMvto || '-' },
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
      { label: 'CEP Destinatário', value: d.idCepDestinatario || '-' },
      { label: 'Qtde Dias', value: d.qtdeDias ?? '-' },
      { label: 'Data Prevista', value: d.dataPrevista || '-' },
      { label: 'Tipo Frete', value: d.tpFrete || '-' },
      { label: 'Código Mercadoria', value: d.idCodigoMercadoria ?? '-' },
    ];
  }, [prazoState.data]);

  const trackingRows = useMemo(() => {
    const d = trackingState.data;
    if (!d) return null;
    return Object.entries(d).map(([k, v]) => {
      if (v === null || v === undefined) return { label: k, value: '-' };
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        return { label: k, value: String(v) };
      }
      return {
        label: k,
        value: (
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.75rem' }}>
            {JSON.stringify(v, null, 2)}
          </pre>
        ),
      };
    });
  }, [trackingState.data]);


  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Card sx={{ mb: 4, boxShadow: 3 }}>
        <CardHeader
          title="Painel Logística (SSW ACCERT)"
          subheader="Consultas na WebAPI SSW (consulta genérica)"
          action={<SearchIcon sx={{ mt: 1, mr: 1, color: 'text.secondary' }} />}
        />
        <Divider />
        <CardContent>
          <Tabs value={tabIndex} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ mb: 3 }}>
            <Tab label="Tracking por Chave" />
            <Tab label="Cliente (CNPJ/CPF)" />
            <Tab label="CEP" />
            <Tab label="Prazo" />
          </Tabs>

          {tabIndex === 0 && (
            <Box>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} md={8}>
                  <TextField fullWidth label="Chave DANFE (44 dígitos)" value={nfChaveNfe} onChange={(e) => setNfChaveNfe(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button variant="contained" fullWidth onClick={onConsultarTrackingDanfe} disabled={trackingState.loading}>
                    {trackingState.loading ? <CircularProgress size={24} /> : 'Consultar'}
                  </Button>
                </Grid>
              </Grid>
              {trackingState.error && (
                <Alert severity="error" sx={{ mt: 2 }} icon={<AlertCircleIcon />}>
                  {trackingState.error}
                </Alert>
              )}
              {trackingRows && <KeyValueTable rows={trackingRows} />}
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
                  <TextField fullWidth label="CEP Destinatário" value={prazoCepDest} onChange={(e) => setPrazoCepDest(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Tipo Frete" value={prazoTpFrete} onChange={(e) => setPrazoTpFrete(e.target.value)} size="small" />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField fullWidth label="Cód. Mercadoria" value={prazoCodMerc} onChange={(e) => setPrazoCodMerc(e.target.value)} size="small" />
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
