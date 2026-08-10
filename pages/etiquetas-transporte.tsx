import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CleaningServices as CleaningServicesIcon,
  Download as DownloadIcon,
  LocalPrintshop as LocalPrintshopIcon,
  LocalShipping as LocalShippingIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ProtectedRoute from '@/components/ProtectedRoute';
import InputMask from '@/components/InputMask';
import { AppLayout } from '@/components/layout/AppLayout';
import { PrinterSelector } from '@/components/labels/PrinterSelector';
import { TransportLabelPreview } from '@/components/labels/TransportLabelPreview';
import api from '@/lib/api';
import { generateZplTransportLabels } from '@/lib/zpl-transport';
import {
  formatarNomeTransportadora,
  sanitizeNumeroPedido,
  TRANSPORTADORA_PADRAO,
  TRANSPORTADORAS_VALIDAS,
  validateTransportLabelInput,
} from '@/lib/etiquetas-transporte';
import type { DadosPedidoEtiqueta } from '@/lib/etiquetas-transporte';
import { printTransportLabelsInBrowser } from '@/services/browser-label-print';
import {
  configureQzSecurity,
  detectQzStatus,
  getSavedPrinter,
  isZplCompatiblePrinter,
  listLocalPrinters,
  printRawZpl,
  QZ_DOWNLOAD_URL,
  savePreferredPrinter,
} from '@/services/qz-print';
import { EtiquetaLoteData, QzStatus } from '@/types/labels';
import { USER_TYPES } from '@/types/auth-types';

const INITIAL_QZ_STATUS: QzStatus = {
  code: 'checking',
  message: 'Verificando conexao com o QZ Tray...',
};

const COMPACT_BUTTON_SX = {
  borderRadius: 1.25,
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.78rem',
  minHeight: 32,
  py: 0.5,
  px: 1.25,
  boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
  '& .MuiButton-startIcon': { mr: 0.6 },
  '& .MuiSvgIcon-root': { fontSize: 17 },
};

const HISTORICO_LIMITE = 10;

export default function EtiquetasTransportePage() {
  const { enqueueSnackbar } = useSnackbar();
  const pedidoInputRef = useRef<HTMLInputElement | null>(null);

  const [numeroPedido, setNumeroPedido] = useState('');
  const [volumes, setVolumes] = useState(1);
  const [cliente, setCliente] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [transportadora, setTransportadora] = useState(TRANSPORTADORA_PADRAO);
  const [numeroNota, setNumeroNota] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [lote, setLote] = useState<EtiquetaLoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [qzConnected, setQzConnected] = useState(false);
  const [checkingQz, setCheckingQz] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [printer, setPrinter] = useState('');
  const [qzStatus, setQzStatus] = useState<QzStatus>(INITIAL_QZ_STATUS);

  const [lotesHistorico, setLotesHistorico] = useState<EtiquetaLoteData[]>([]);
  const [buscandoHistorico, setBuscandoHistorico] = useState(false);
  const [pedidoPesquisa, setPedidoPesquisa] = useState('');
  const [buscandoPedido, setBuscandoPedido] = useState(false);

  const printerIsCompatible = useMemo(() => (printer ? isZplCompatiblePrinter(printer) : false), [printer]);

  useEffect(() => {
    configureQzSecurity();
    void refreshPrinters(false);
    void carregarHistorico('');
    pedidoInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshPrinters(showToasts: boolean) {
    setCheckingQz(true);
    setQzStatus(INITIAL_QZ_STATUS);

    try {
      const status = await detectQzStatus();
      setQzStatus(status);

      if (status.code !== 'connected') {
        setQzConnected(false);
        setPrinters([]);
        setPrinter('');
        if (showToasts) {
          enqueueSnackbar(status.message, { variant: status.code === 'authorization_required' ? 'info' : 'warning' });
        }
        return;
      }

      const result = await listLocalPrinters();
      const printersRaw = Array.isArray(result.printers) ? (result.printers as string[]) : [];
      const availablePrinters = printersRaw.length > 0 ? printersRaw : ['Zebra ZD-220 (COPIA)'];
      setPrinters(availablePrinters);
      setQzConnected(true);
      setQzStatus({
        code: printersRaw.length > 0 ? 'connected' : 'no_printers',
        message: printersRaw.length > 0
          ? result.source === 'windows'
            ? 'QZ Tray conectado. Impressoras carregadas pelo Windows como apoio.'
            : 'QZ Tray conectado e impressoras locais carregadas.'
          : 'QZ Tray conectado, mas nenhuma impressora local foi encontrada.',
      });

      const previousPrinter = getSavedPrinter();
      if (previousPrinter && availablePrinters.includes(previousPrinter)) {
        setPrinter(previousPrinter);
      } else if (availablePrinters.length > 0) {
        const zebra = availablePrinters.find((item) => isZplCompatiblePrinter(item));
        setPrinter(zebra || availablePrinters[0]);
      }

      if (showToasts) {
        if (result.printers.length > 0) {
          enqueueSnackbar(
            result.source === 'windows'
              ? 'Impressoras encontradas pelo Windows e carregadas na tela.'
              : 'QZ Tray conectado e impressoras atualizadas.',
            { variant: 'success' }
          );
        } else {
          enqueueSnackbar('Nenhuma impressora local foi encontrada. Usando fallback da Zebra.', { variant: 'warning' });
        }
      }
    } catch (error: any) {
      setQzConnected(false);
      setPrinters([]);
      setPrinter('');
      setQzStatus({
        code: 'error',
        message: error?.message || 'Nao foi possivel conectar ao QZ Tray.',
      });
      if (showToasts) {
        enqueueSnackbar('Nao foi possivel conectar ao QZ Tray.', { variant: 'error' });
      }
    } finally {
      setCheckingQz(false);
    }
  }

  function handleInstallQzTray() {
    window.open(QZ_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
    enqueueSnackbar(
      'Abrimos o download oficial do QZ Tray. Instale, abra o aplicativo e depois clique em testar novamente.',
      { variant: 'info' }
    );
  }

  async function carregarHistorico(pedido: string) {
    try {
      setBuscandoHistorico(true);
      const response = await api.get<EtiquetaLoteData[]>('/api/etiquetas/lotes', {
        params: {
          numeroPedido: pedido || undefined,
          limite: HISTORICO_LIMITE,
        },
      });
      setLotesHistorico(response.data);
    } catch {
      setLotesHistorico([]);
    } finally {
      setBuscandoHistorico(false);
    }
  }

  async function handleGerar() {
    const validation = validateTransportLabelInput({ numeroPedido, volumes });
    if (!validation.ok) {
      enqueueSnackbar(validation.message, { variant: 'warning' });
      pedidoInputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      const response = await api.post<EtiquetaLoteData>('/api/etiquetas/lotes', {
        numeroPedido,
        volumes,
        cliente,
        cnpj,
        transportadora,
        numeroNota,
        observacoes,
      });
      setLote(response.data);
      enqueueSnackbar(
        `Lote criado com ${response.data.volumes} etiqueta(s). Codigo de barras unico por volume gerado.`,
        { variant: 'success' }
      );
      await carregarHistorico(pedidoPesquisa);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Nao foi possivel criar o lote de etiquetas.', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleLimpar() {
    setNumeroPedido('');
    setVolumes(1);
    setCliente('');
    setCnpj('');
    setTransportadora(TRANSPORTADORA_PADRAO);
    setNumeroNota('');
    setObservacoes('');
    setLote(null);
    pedidoInputRef.current?.focus();
  }

  async function handleBuscarPedido() {
    const pedido = sanitizeNumeroPedido(numeroPedido);
    if (!pedido) {
      enqueueSnackbar('Informe o numero do pedido para buscar.', { variant: 'warning' });
      pedidoInputRef.current?.focus();
      return;
    }

    try {
      setBuscandoPedido(true);
      const response = await api.get<DadosPedidoEtiqueta & { numeroPedido?: string }>(
        '/api/etiquetas/pedido-info',
        { params: { numero_pedido: pedido } }
      );
      const dados = response.data;

      setNumeroPedido(dados.numeroPedido || pedido);
      if (dados.cliente) setCliente(dados.cliente);
      if (dados.cnpj) setCnpj(dados.cnpj);
      if (dados.transportadora && (TRANSPORTADORAS_VALIDAS as readonly string[]).includes(dados.transportadora)) {
        setTransportadora(dados.transportadora);
      }
      if (dados.volumes > 0) setVolumes(dados.volumes);
      if (dados.numeroNota) setNumeroNota(dados.numeroNota);

      enqueueSnackbar(
        `Dados do pedido ${pedido} preenchidos. Confira cliente, CNPJ e volumes antes de gerar.`,
        { variant: 'success' }
      );
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        status === 404
          ? 'Pedido nao encontrado na API externa.'
          : error?.response?.data?.message || 'Nao foi possivel buscar os dados do pedido.';
      enqueueSnackbar(message, { variant: 'warning' });
    } finally {
      setBuscandoPedido(false);
    }
  }

  async function handlePesquisarHistorico() {
    await carregarHistorico(pedidoPesquisa.trim());
  }

  async function handleReimprimir(item: EtiquetaLoteData) {
    try {
      setLoading(true);
      const response = await api.get<EtiquetaLoteData>(`/api/etiquetas/lotes/${item.id}`);
      setLote(response.data);
      enqueueSnackbar('Lote carregado para reimpressao. Confira a previa e imprima.', { variant: 'info' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.message || 'Nao foi possivel carregar o lote para reimpressao.', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePrint() {
    if (!lote || lote.volumesEtiquetas.length === 0) return;

    try {
      setPrinting(true);
      const volumesImprimir = lote.volumesEtiquetas;

      if (printerIsCompatible) {
        const zpl = generateZplTransportLabels(lote, volumesImprimir);
        await printRawZpl(printer, zpl);
      } else {
        printTransportLabelsInBrowser(lote, volumesImprimir, printer);
      }

      savePreferredPrinter(printer);

      // Registra que os volumes foram impressos (para conferencia posterior).
      await api.post(`/api/etiquetas/lotes/${lote.id}/imprimir`).catch(() => undefined);

      setLote((atual) =>
        atual
          ? { ...atual, volumesEtiquetas: atual.volumesEtiquetas.map((vol) => ({ ...vol, impressoEm: new Date().toISOString() })) }
          : atual
      );
      await carregarHistorico(pedidoPesquisa);

      enqueueSnackbar(
        printerIsCompatible
          ? 'Etiquetas de transporte enviadas para impressao na Zebra.'
          : 'Previa de impressao aberta. Confira as etiquetas e clique em imprimir na janela.',
        { variant: 'success' }
      );
    } catch (error: any) {
      enqueueSnackbar('Nao foi possivel imprimir as etiquetas de transporte.', { variant: 'error' });
      console.error('[etiquetas-transporte] Erro ao imprimir:', error);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <ProtectedRoute
      allowedRoles={[
        USER_TYPES.ADMIN,
        USER_TYPES.GERENTE,
        USER_TYPES.USUARIO,
        USER_TYPES.SEPARADOR,
        USER_TYPES.CONFERENTE,
        USER_TYPES.AUDITOR,
      ]}
    >
      <AppLayout
        title="Etiquetas de Transporte"
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Etiquetas' },
          { label: 'Transporte' },
        ]}
        actions={(
          <Button
            size="small"
            variant="outlined"
            startIcon={checkingQz ? <CircularProgress size={18} color="inherit" /> : <LocalPrintshopIcon />}
            onClick={() => void refreshPrinters(true)}
            sx={COMPACT_BUTTON_SX}
          >
            Atualizar impressoras
          </Button>
        )}
      >
        <Stack spacing={3}>
          <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.78), backdropFilter: 'blur(12px)' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <LocalShippingIcon color="primary" />
                <Typography variant="h6" fontWeight={800}>
                  Gerar etiquetas do pedido
                </Typography>
              </Stack>
              <Grid container spacing={2} alignItems="stretch">
                <Grid item xs={12} md={4}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <TextField
                        fullWidth
                        label="Numero do pedido"
                        placeholder="Ex.: 12345"
                        value={numeroPedido}
                        onChange={(event) => setNumeroPedido(event.target.value)}
                        inputRef={pedidoInputRef}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            void handleGerar();
                          }
                        }}
                      />
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={buscandoPedido ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                      onClick={() => void handleBuscarPedido()}
                      disabled={buscandoPedido}
                      title="Buscar dados do pedido na API externa"
                      sx={COMPACT_BUTTON_SX}
                    >
                      Buscar
                    </Button>
                  </Stack>
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    label="Quantidade de volumes"
                    type="number"
                    value={volumes}
                    onChange={(event) => setVolumes(Math.max(1, Math.floor(Number(event.target.value) || 1)))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Cliente (opcional)"
                    value={cliente}
                    onChange={(event) => setCliente(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <InputMask
                    fullWidth
                    label="CNPJ do cliente (opcional)"
                    mask="cnpj"
                    value={cnpj}
                    onChange={(value) => setCnpj(value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="NF (opcional)"
                    value={numeroNota}
                    onChange={(event) => setNumeroNota(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    select
                    label="Transportadora"
                    value={transportadora}
                    onChange={(event) => setTransportadora(event.target.value)}
                  >
                    {TRANSPORTADORAS_VALIDAS.map((item) => (
                      <MenuItem key={item} value={item}>
                        {formatarNomeTransportadora(item)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Observacoes (opcional)"
                    value={observacoes}
                    onChange={(event) => setObservacoes(event.target.value)}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PrintIcon />}
                      onClick={() => void handleGerar()}
                      disabled={loading}
                      sx={COMPACT_BUTTON_SX}
                    >
                      Gerar etiquetas
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CleaningServicesIcon />}
                      onClick={handleLimpar}
                      sx={COMPACT_BUTTON_SX}
                    >
                      Limpar
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              {lote ? (
                <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.78), backdropFilter: 'blur(12px)' }}>
                  <CardContent>
                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                      <PrintIcon color="primary" />
                      <Typography variant="h6" fontWeight={800}>
                        Etiquetas geradas
                      </Typography>
                    </Stack>
                    <TransportLabelPreview lote={lote} />
                    <Divider sx={{ my: 2 }} />
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={printing ? <CircularProgress size={18} color="inherit" /> : <LocalPrintshopIcon />}
                      onClick={() => void handlePrint()}
                      disabled={printing || !printer}
                      sx={COMPACT_BUTTON_SX}
                    >
                      {printerIsCompatible ? 'Imprimir na Zebra' : 'Imprimir (navegador)'}
                    </Button>
                    {!printer && (
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Selecione uma impressora abaixo para imprimir.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.78), backdropFilter: 'blur(12px)' }}>
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      A previa das etiquetas aparecera aqui.
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
            <Grid item xs={12} lg={4}>
              <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.78), backdropFilter: 'blur(12px)' }}>
                <CardContent>
                  <PrinterSelector
                    printers={printers}
                    printer={printer}
                    onChange={setPrinter}
                  status={qzStatus}
                  onInstall={handleInstallQzTray}
                  onRetry={() => void refreshPrinters(true)}
                  hideDescription
                  hideFooterNote
                />
              </CardContent>
            </Card>
            </Grid>
          </Grid>

          <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.78), backdropFilter: 'blur(12px)' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" mb={2} useFlexGap flexWrap="wrap">
                <Stack direction="row" spacing={1} alignItems="center">
                  <RefreshIcon color="primary" />
                  <Typography variant="h6" fontWeight={800}>
                    Historico de lotes
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    label="Pesquisar por pedido"
                    value={pedidoPesquisa}
                    onChange={(event) => setPedidoPesquisa(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handlePesquisarHistorico();
                      }
                    }}
                    sx={{ minWidth: 220 }}
                  />
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={buscandoHistorico ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                    onClick={() => void handlePesquisarHistorico()}
                    disabled={buscandoHistorico}
                    sx={COMPACT_BUTTON_SX}
                  >
                    Buscar
                  </Button>
                </Stack>
              </Stack>

              {lotesHistorico.length === 0 && !buscandoHistorico ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum lote encontrado.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {lotesHistorico.map((item) => {
                    const impressos = item.volumesEtiquetas.filter((vol) => vol.impressoEm).length;
                    return (
                      <Box
                        key={item.id}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: `1px solid ${alpha('#94a3b8', 0.3)}`,
                          background: alpha('#f8fafc', 0.7),
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 1.5,
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={800}>
                            Pedido {item.numeroPedido} - {item.volumes} volume(s)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {new Date(item.dataCriacao).toLocaleString('pt-BR')} - {impressos}/{item.volumes} impresso(s)
                            {item.criadoPorUser?.nome ? ` - por ${item.criadoPorUser.nome}` : ''}
                          </Typography>
                          {item.cliente && (
                            <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ maxWidth: 420 }}>
                              {item.cliente} - {formatarNomeTransportadora(item.transportadora)}
                            </Typography>
                          )}
                        </Box>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PrintIcon />}
                          onClick={() => void handleReimprimir(item)}
                          sx={COMPACT_BUTTON_SX}
                        >
                          Reimprimir
                        </Button>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      </AppLayout>
    </ProtectedRoute>
  );
}

// Desativa o embrulho automático do _app.tsx para não duplicar o menu lateral
(EtiquetasTransportePage as any).usesAppLayout = true;
