import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
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
  Label as LabelIcon,
  LocalPrintshop as LocalPrintshopIcon,
  LocalShipping as LocalShippingIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LabelPreview } from '@/components/labels/LabelPreview';
import { PrinterSelector } from '@/components/labels/PrinterSelector';
import api from '@/lib/api';
import { analyzeBarcode } from '@/lib/barcode-validation';
import { generateZplLabels } from '@/lib/zpl-generator';
import { printLabelsInBrowser } from '@/services/browser-label-print';
import {
  configureQzSecurity,
  detectQzStatus,
  isZplCompatiblePrinter,
  listLocalPrinters,
  printRawZpl,
  QZ_DOWNLOAD_URL,
  savePreferredPrinter,
} from '@/services/qz-print';
import { LabelType, ProdutoEtiqueta, QzStatus } from '@/types/labels';
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

export default function CriarEtiquetasPage() {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [codigoAdm, setCodigoAdm] = useState('');
  const [produto, setProduto] = useState<ProdutoEtiqueta | null>(null);
  const [quantidade, setQuantidade] = useState(3);
  const [labelType, setLabelType] = useState<LabelType>('UNITARIA');
  const [loading, setLoading] = useState(false);
  const [previewRequested, setPreviewRequested] = useState(false);
  const [qzConnected, setQzConnected] = useState(false);
  const [checkingQz, setCheckingQz] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [printer, setPrinter] = useState('');
  const [printing, setPrinting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [qzStatus, setQzStatus] = useState<QzStatus>(INITIAL_QZ_STATUS);

  const selectedBarcode = labelType === 'CAIXA_FECHADA'
    ? produto?.codigoBarrasCaixaFechada
    : produto?.codigoBarras;
  const barcodeInfo = useMemo(() => analyzeBarcode(selectedBarcode), [selectedBarcode]);
  const printerIsCompatible = useMemo(() => (printer ? isZplCompatiblePrinter(printer) : false), [printer]);
  const usesBrowserA4Layout =
    labelType === 'A4_PRODUTO'
    || labelType === 'A4_PRODUTO_VERTICAL'
    || labelType === 'A4_PRODUTO_VERTICAL_DUPLA';
  const printsDirectlyInZebra = printerIsCompatible && !usesBrowserA4Layout;
  const canPrint = Boolean(
    produto
    && barcodeInfo.isValid
    && quantidade > 0
    && (usesBrowserA4Layout || (printer && qzConnected)),
  );

  useEffect(() => {
    configureQzSecurity();
    void refreshPrinters(false);
    inputRef.current?.focus();
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
          enqueueSnackbar(status.message, {
            variant: status.code === 'authorization_required' ? 'info' : 'warning',
          });
        }
        return;
      }

      const result = await listLocalPrinters();
      setPrinters(result.printers);
      setPrinter((current) => current || result.suggestedPrinter);
      setQzConnected(true);
      setQzStatus({
        code: result.printers.length > 0 ? 'connected' : 'no_printers',
        message: result.printers.length > 0
          ? result.source === 'windows'
            ? 'QZ Tray conectado. Impressoras carregadas pelo Windows como apoio.'
            : 'QZ Tray conectado e impressoras locais carregadas.'
          : 'QZ Tray conectado, mas nenhuma impressora local foi encontrada.',
      });

      if (showToasts) {
        if (result.printers.length > 0) {
          enqueueSnackbar(
            result.source === 'windows'
              ? 'Impressoras encontradas pelo Windows e carregadas na tela.'
              : 'QZ Tray conectado e impressoras atualizadas.',
            { variant: 'success' }
          );
        } else {
          enqueueSnackbar('Nenhuma impressora local foi encontrada.', { variant: 'warning' });
        }
      }
    } catch (error: any) {
      setQzConnected(false);
      setPrinters([]);
      setPrinter('');
      setQzStatus({
        code: 'error',
        message: error?.message || 'Nao foi possivel validar a conexao com o QZ Tray.',
      });

      if (showToasts) {
        enqueueSnackbar(error?.message || 'Nao foi possivel validar a conexao com o QZ Tray.', {
          variant: 'error',
        });
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

  async function handleSearch() {
    if (!codigoAdm.trim()) {
      enqueueSnackbar('Informe o codigo ADM para pesquisar.', { variant: 'warning' });
      inputRef.current?.focus();
      return;
    }

    try {
      setLoading(true);
      const response = await api.get<ProdutoEtiqueta>(`/api/etiquetas/produto/${encodeURIComponent(codigoAdm.trim())}`);
      setProduto(response.data);
      setLabelType('UNITARIA');
      setPreviewRequested(true);

      if (!response.data.codigoBarras) {
        enqueueSnackbar('Este produto nao possui codigo de barras cadastrado.', { variant: 'warning' });
      } else {
        enqueueSnackbar('Produto encontrado com sucesso.', { variant: 'success' });
      }
    } catch (error: any) {
      setProduto(null);
      enqueueSnackbar(error.response?.data?.message || 'Produto nao encontrado para o codigo ADM informado.', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setCodigoAdm('');
    setProduto(null);
    setQuantidade(3);
    setLabelType('UNITARIA');
    setPreviewRequested(false);
    inputRef.current?.focus();
  }

  async function registerHistory(result: 'SUCESSO' | 'ERRO', message?: string) {
    if (!produto) return;

    await api.post('/api/etiquetas/print-history', {
      produtoId: produto.produtoId,
      codigoAdm: produto.codigoAdm,
      nomeProduto: produto.nome,
      marcaProduto: produto.marca,
      codigoBarras: selectedBarcode || '',
      quantidade,
      impressora: printer || 'NAO INFORMADA',
      resultado: result,
      mensagemErro: message || null,
    }).catch(() => undefined);
  }

  async function handlePrint() {
    if (!produto) return;

    try {
      setPrinting(true);
      if (printsDirectlyInZebra) {
        const zpl = generateZplLabels(produto, quantidade, labelType);
        await printRawZpl(printer, zpl);
      } else {
        printLabelsInBrowser(produto, quantidade, printer, labelType);
      }

      savePreferredPrinter(printer);
      await registerHistory('SUCESSO');
      enqueueSnackbar(
        printsDirectlyInZebra
          ? 'Etiquetas enviadas para impressao na Zebra.'
          : 'Previa de impressao aberta. Confira a etiqueta e clique em imprimir na janela.',
        { variant: 'success' }
      );
      inputRef.current?.focus();
    } catch (error: any) {
      await registerHistory('ERRO', error?.message || 'Erro de impressao');
      enqueueSnackbar('Nao foi possivel imprimir as etiquetas.', { variant: 'error' });
    } finally {
      setPrinting(false);
    }
  }

  async function handleDownloadPdf() {
    if (!produto || !usesBrowserA4Layout) return;

    try {
      setDownloadingPdf(true);
      printLabelsInBrowser(produto, quantidade, printer, labelType, 'pdf');
      enqueueSnackbar('Arquivo aberto. Escolha Salvar como PDF e mantenha a escala em 100%.', { variant: 'success' });
    } catch (error: unknown) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Nao foi possivel gerar o PDF das etiquetas.', { variant: 'error' });
    } finally {
      setDownloadingPdf(false);
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
        title="Etiquetas de Produto"
        subtitle="Pesquise um produto pelo codigo ADM e imprima etiquetas com codigo de barras."
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Etiquetas de Produto' },
        ]}
        actions={(
          <>
            <Button
              size="small"
              variant="contained"
              startIcon={<LocalShippingIcon />}
              onClick={() => void router.push('/etiquetas-transporte')}
              sx={COMPACT_BUTTON_SX}
            >
              Etiquetas de Transporte
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={checkingQz ? <CircularProgress size={18} color="inherit" /> : <LocalPrintshopIcon />}
              onClick={() => void refreshPrinters(true)}
              sx={COMPACT_BUTTON_SX}
            >
              Atualizar impressoras
            </Button>
          </>
        )}
      >
        <Stack spacing={3}>
          <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.78), backdropFilter: 'blur(12px)' }}>
            <CardContent>
              <Grid container spacing={2} alignItems="stretch">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Codigo ADM"
                    value={codigoAdm}
                    onChange={(event) => setCodigoAdm(event.target.value)}
                    inputRef={inputRef}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void handleSearch();
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    label="Quantidade"
                    type="number"
                    value={quantidade}
                    onChange={(event) => setQuantidade(Math.max(1, Number(event.target.value) || 1))}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    select
                    fullWidth
                    label="Tipo da etiqueta"
                    value={labelType}
                    onChange={(event) => setLabelType(event.target.value as LabelType)}
                  >
                    <MenuItem value="UNITARIA">Produto (3 por linha)</MenuItem>
                    <MenuItem value="CAIXA_FECHADA">Caixa fechada 100 x 60 mm</MenuItem>
                    <MenuItem value="A4_PRODUTO">Produto 18 x 11 cm (2 por A4)</MenuItem>
                    <MenuItem value="A4_PRODUTO_VERTICAL">Produto 15 x 21 cm vertical (1 por A4)</MenuItem>
                    <MenuItem value="A4_PRODUTO_VERTICAL_DUPLA">Produto vertical 8 x 14 cm A4 paisagem (3 por A4)</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    flexWrap="wrap"
                    alignItems="center"
                    justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
                    height="100%"
                  >
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                      onClick={() => void handleSearch()}
                      disabled={loading}
                      sx={COMPACT_BUTTON_SX}
                    >
                      Pesquisar
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<CleaningServicesIcon />}
                      onClick={handleClear}
                      sx={COMPACT_BUTTON_SX}
                    >
                      Limpar
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<LabelIcon />}
                      onClick={() => setPreviewRequested(true)}
                      disabled={!produto}
                      sx={COMPACT_BUTTON_SX}
                    >
                      Visualizar etiqueta
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {produto && (
            <Grid container spacing={3}>
              <Grid item xs={12} lg={5}>
                <Card sx={{ borderRadius: 4, height: '100%', background: alpha('#ffffff', 0.78), backdropFilter: 'blur(12px)' }}>
                  <CardContent>
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="h6" fontWeight={900}>Produto encontrado</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Confira os dados retornados pela integracao antes de imprimir.
                        </Typography>
                      </Box>

                      <Stack spacing={1.5}>
                        <Typography><strong>Produto:</strong> {produto.nome}</Typography>
                        <Typography><strong>Marca:</strong> {produto.marca || 'Sem marca'}</Typography>
                        <Typography><strong>Codigo ADM:</strong> {produto.codigoAdm}</Typography>
                        <Typography><strong>Codigo original:</strong> {produto.codigoOriginal || 'Nao informado'}</Typography>
                        <Typography><strong>Codigo de barras:</strong> {produto.codigoBarras || 'Nao informado'}</Typography>
                        <Typography><strong>Codigo da caixa fechada:</strong> {produto.codigoBarrasCaixaFechada || 'Nao informado'}</Typography>
                        <Typography><strong>Unidades por caixa:</strong> {produto.quantidadeCaixaFechada || 'Nao informado'}</Typography>
                        <Typography><strong>Tipo identificado:</strong> {barcodeInfo.type}</Typography>
                        <Typography><strong>Situacao da consulta:</strong> Produto encontrado</Typography>
                      </Stack>

                      <Divider />

                      {!barcodeInfo.isValid && (
                        <Alert severity="warning">
                          {labelType === 'CAIXA_FECHADA' && !produto.codigoBarrasCaixaFechada
                            ? 'Este produto nao possui codigo auxiliar de caixa fechada na API.'
                            : barcodeInfo.reason || 'Codigo de barras invalido.'}
                        </Alert>
                      )}

                      {(usesBrowserA4Layout || (printer && !printerIsCompatible)) && (
                        <Alert severity="info">
                          {usesBrowserA4Layout
                            ? labelType === 'A4_PRODUTO'
                              ? 'Impressao e PDF usam o mesmo arquivo, com duas etiquetas 18 x 11 cm e espacamento de 4 cm. Use Tamanho real ou escala 100%.'
                              : labelType === 'A4_PRODUTO_VERTICAL'
                                ? 'Impressao e PDF usam o mesmo arquivo, com uma etiqueta vertical 15 x 21 cm, foto em cima e informacoes embaixo. Use Tamanho real ou escala 100%.'
                                : 'Impressao e PDF usam o mesmo arquivo, com tres etiquetas verticais 8 x 14 cm em A4 paisagem. Use Tamanho real ou escala 100%.'
                            : 'Esta impressora vai abrir uma previa visual no navegador. Para Zebra/ZDesigner, a impressao continua direta pelo QZ Tray.'}
                        </Alert>
                      )}

                      <PrinterSelector
                        printers={printers}
                        printer={printer}
                        onChange={setPrinter}
                        status={qzStatus}
                        onInstall={handleInstallQzTray}
                        onRetry={() => void refreshPrinters(true)}
                      />

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={printing ? <CircularProgress size={18} color="inherit" /> : <LocalPrintshopIcon />}
                          disabled={!canPrint || printing}
                          onClick={() => void handlePrint()}
                          sx={COMPACT_BUTTON_SX}
                        >
                          {usesBrowserA4Layout
                            ? 'Abrir impressao A4'
                            : printsDirectlyInZebra
                              ? 'Imprimir na Zebra'
                              : 'Imprimir em outra impressora'}
                        </Button>
                        {usesBrowserA4Layout && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={downloadingPdf ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
                            disabled={!barcodeInfo.isValid || quantidade <= 0 || downloadingPdf}
                            onClick={() => void handleDownloadPdf()}
                            sx={COMPACT_BUTTON_SX}
                          >
                            Gerar PDF
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={checkingQz ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
                          onClick={() => {
                            if (qzStatus.code === 'not_installed') {
                              handleInstallQzTray();
                            } else {
                              void refreshPrinters(true);
                            }
                          }}
                          sx={COMPACT_BUTTON_SX}
                        >
                          {qzStatus.code === 'not_installed' ? 'Baixar QZ Tray' : 'Testar conexao QZ'}
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} lg={7}>
                <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.78), backdropFilter: 'blur(12px)' }}>
                  <CardContent>
                    {previewRequested ? (
                      <LabelPreview produto={produto} quantidade={quantidade} labelType={labelType} />
                    ) : (
                      <Typography color="text.secondary">
                        Clique em visualizar etiqueta para gerar a previa.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {qzStatus.code === 'not_installed' && (
            <Alert
              severity="warning"
              action={(
                <Button color="inherit" size="small" onClick={handleInstallQzTray} sx={COMPACT_BUTTON_SX}>
                  Baixar agora
                </Button>
              )}
            >
              QZ Tray nao encontrado. O sistema abriu o fluxo assistido: baixar, instalar, abrir o aplicativo e testar novamente.
            </Alert>
          )}

          {qzStatus.code === 'authorization_required' && (
            <Alert severity="info">
              QZ Tray instalado. Falta autorizar este site no aplicativo para liberar a busca da impressora e a impressao.
            </Alert>
          )}

          {!qzConnected && qzStatus.code === 'error' && (
            <Alert severity="warning">
              {qzStatus.message}
            </Alert>
          )}
        </Stack>
      </AppLayout>
    </ProtectedRoute>
  );
}

(CriarEtiquetasPage as any).usesAppLayout = true;
