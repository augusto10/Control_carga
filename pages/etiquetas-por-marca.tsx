import { UIEvent, useEffect, useMemo, useState } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  PictureAsPdf as PictureAsPdfIcon,
  Search as SearchIcon,
  Sell as SellIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { analyzeBarcode } from '@/lib/barcode-validation';
import { printProductLabelsInBrowser } from '@/services/browser-label-print';
import type { LabelType, ProdutoEtiqueta, ProdutosPorMarcaResponse } from '@/types/labels';
import { USER_TYPES } from '@/types/auth-types';

const LABEL_OPTIONS: Array<{ value: LabelType; label: string }> = [
  { value: 'A4_PRODUTO', label: 'Produto 18 x 11 cm (2 por A4)' },
  { value: 'A4_PRODUTO_LANDSCAPE', label: 'Produto grande A4 paisagem (1 por A4)' },
  { value: 'A4_PRODUTO_VERTICAL', label: 'Produto vertical 20 x 28,7 cm (1 por A4)' },
  { value: 'A4_PRODUTO_VERTICAL_DUPLA', label: 'Produto vertical 8 x 14 cm A4 paisagem (3 por A4)' },
  { value: 'A4_PRODUTO_VERTICAL_GRANDE_DUPLA', label: 'Produto vertical grande 13,5 x 19 cm A4 paisagem (2 por A4)' },
  { value: 'A4_PRODUTO_VERTICAL_TRIPLA', label: 'Produto 15 x 6 cm (3 por A4)' },
  { value: 'UNITARIA', label: 'Produto (3 por linha)' },
  { value: 'CAIXA_FECHADA', label: 'Caixa fechada 100 x 60 mm' },
];
const PRODUCTS_BATCH_SIZE = 40;

export default function EtiquetasPorMarcaPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [marca, setMarca] = useState('');
  const [produtos, setProdutos] = useState<ProdutoEtiqueta[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [labelType, setLabelType] = useState<LabelType>('A4_PRODUTO');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searched, setSearched] = useState(false);
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_BATCH_SIZE);

  // Todos os produtos da marca (com ou sem código de barras)
  const allProducts = useMemo(() => produtos, [produtos]);

  const visibleProducts = useMemo(
    () => allProducts.slice(0, visibleCount),
    [allProducts, visibleCount],
  );
  const selectedCount = selecionados.size;
  const allSelected = allProducts.length > 0 && selectedCount === allProducts.length;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    setVisibleCount(PRODUCTS_BATCH_SIZE);
  }, [allProducts.length, labelType]);

  async function handleSearch() {
    const value = marca.trim();
    if (value.length < 2) {
      enqueueSnackbar('Digite pelo menos 2 caracteres da marca.', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      setSearched(false);
      setSelecionados(new Set());
      setVisibleCount(PRODUCTS_BATCH_SIZE);
      const response = await api.get<ProdutosPorMarcaResponse>('/api/etiquetas/produtos-por-marca', {
        params: { marca: value },
      });
      setProdutos(response.data.produtos);
      setCatalogUpdatedAt(response.data.catalogo?.atualizadoEm || null);
      setSearched(true);
      enqueueSnackbar(
        response.data.total
          ? `${response.data.total} produto(s) elegivel(is) encontrado(s).`
          : 'Nenhum produto elegivel foi encontrado para esta marca.',
        { variant: response.data.total ? 'success' : 'info' },
      );
    } catch (error: unknown) {
      setProdutos([]);
      setCatalogUpdatedAt(null);
      setSearched(true);
      const requestError = error as { response?: { data?: { message?: string } } };
      enqueueSnackbar(requestError.response?.data?.message || 'Nao foi possivel consultar os produtos da marca.', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleProduct(produtoId: string) {
    setSelecionados((current) => {
      const next = new Set(current);
      if (next.has(produtoId)) next.delete(produtoId);
      else next.add(produtoId);
      return next;
    });
  }

  function toggleAll() {
    setSelecionados(allSelected ? new Set() : new Set(allProducts.map((produto) => produto.produtoId)));
  }

  function handleLabelTypeChange(nextType: LabelType) {
    setLabelType(nextType);
    setSelecionados(new Set());
  }

  function handleProductsScroll(event: UIEvent<HTMLDivElement>) {
    const target = event.currentTarget;
    const remaining = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (remaining > 120) return;

    setVisibleCount((current) => (
      current >= allProducts.length
        ? current
        : Math.min(current + PRODUCTS_BATCH_SIZE, allProducts.length)
    ));
  }

  function handleGeneratePdf() {
    const selectedProducts = allProducts.filter((produto) => selecionados.has(produto.produtoId));
    if (!selectedProducts.length) {
      enqueueSnackbar('Selecione pelo menos um produto para gerar o PDF.', { variant: 'warning' });
      return;
    }

    try {
      setGenerating(true);
      const selectedBrand = marca.trim();
      const normalizedBrand = (selectedBrand || 'marca-selecionada')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'marca-selecionada';
      printProductLabelsInBrowser(selectedProducts, '', labelType, 'pdf', {
        previewTitle: selectedBrand ? `Etiquetas da marca ${selectedBrand}` : 'Etiquetas da marca selecionada',
        documentTitle: `pdf-etiquetas-${normalizedBrand}`,
        primaryButtonLabel: 'Salvar as etiquetas',
      });
      enqueueSnackbar('Previa aberta. Clique em Salvar como PDF e mantenha a escala em 100%.', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Nao foi possivel gerar o PDF.', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={[
      USER_TYPES.ADMIN,
      USER_TYPES.GERENTE,
      USER_TYPES.USUARIO,
      USER_TYPES.SEPARADOR,
      USER_TYPES.CONFERENTE,
      USER_TYPES.AUDITOR,
    ]}>
      <AppLayout
        title="Gerar PDF Etiquetas por Marca"
        subtitle="Consulte uma marca, escolha os produtos elegiveis e gere as etiquetas em um unico arquivo."
        breadcrumbs={[{ label: 'Inicio', href: '/' }, { label: 'Etiquetas' }, { label: 'PDF por Marca' }]}
      >
        <Stack spacing={3}>
          <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.82), backdropFilter: 'blur(12px)' }}>
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <TextField
                  fullWidth
                  label="Marca"
                  placeholder="Ex.: Tramontina"
                  value={marca}
                  onChange={(event) => setMarca(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && void handleSearch()}
                  InputProps={{ startAdornment: <SellIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
                />
                <TextField
                  select
                  fullWidth
                  label="Modelo da etiqueta"
                  value={labelType}
                  onChange={(event) => handleLabelTypeChange(event.target.value as LabelType)}
                  sx={{ minWidth: { md: 320 } }}
                >
                  {LABEL_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  disabled={loading}
                  onClick={() => void handleSearch()}
                  sx={{ minWidth: 150, minHeight: 52, borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
                >
                  Buscar marca
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {searched && (
            <Card sx={{ borderRadius: 4, background: alpha('#ffffff', 0.86), overflow: 'hidden' }}>
              <CardContent sx={{ p: 0 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ sm: 'center' }}
                  spacing={2}
                  sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={900}>Produtos encontrados</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {allProducts.length} produto(s) encontrado(s).
                    </Typography>
                    {catalogUpdatedAt && (
                      <Typography variant="caption" color="text.secondary">
                        Base local atualizada em {new Date(catalogUpdatedAt).toLocaleString('pt-BR')}.
                      </Typography>
                    )}
                  </Box>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                    <FormControlLabel
                      control={<Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />}
                      label={`Selecionar todos (${allProducts.length})`}
                    />
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfIcon />}
                      disabled={!selectedCount || generating}
                      onClick={handleGeneratePdf}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 900 }}
                    >
                      {`Gerar PDF das etiquetas (${selectedCount})`}
                    </Button>
                  </Stack>
                </Stack>

                {allProducts.length === 0 ? (
                  <Box sx={{ p: 6, textAlign: 'center' }}>
                    <Typography fontWeight={800}>Nenhum produto encontrado para esta marca.</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Confira a marca pesquisada.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer
                    onScroll={handleProductsScroll}
                    sx={{
                      maxHeight: '62vh',
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': { width: 8 },
                      '&::-webkit-scrollbar-thumb': { backgroundColor: alpha('#0f172a', 0.2), borderRadius: 999 },
                    }}
                  >
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" />
                          <TableCell>Produto</TableCell>
                          <TableCell>Marca</TableCell>
                          <TableCell>Codigo ADM</TableCell>
                          <TableCell>Codigo de barras</TableCell>
                          <TableCell align="center">Situacao</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {visibleProducts.map((produto) => {
                          const selected = selecionados.has(produto.produtoId);
                          const barcode = labelType === 'CAIXA_FECHADA' ? produto.codigoBarrasCaixaFechada : produto.codigoBarras;
                          const hasBarcodeValido = analyzeBarcode(barcode).isValid;
                          return (
                            <TableRow key={produto.produtoId} hover selected={selected}>
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selected}
                                  onChange={() => toggleProduct(produto.produtoId)}
                                />
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Avatar
                                    variant="rounded"
                                    src={produto.imagemUrl || undefined}
                                    alt={produto.nome}
                                    sx={{ width: 48, height: 48, bgcolor: 'grey.100' }}
                                  />
                                  <Typography variant="body2" fontWeight={700}>{produto.nome}</Typography>
                                </Stack>
                              </TableCell>
                              <TableCell>{produto.marca || '-'}</TableCell>
                              <TableCell>{produto.codigoAdm}</TableCell>
                              <TableCell>{barcode || '-'}</TableCell>
                              <TableCell align="center">
                                {hasBarcodeValido ? (
                                  <Typography variant="caption" fontWeight={800} color="success.main">
                                    Pronto
                                  </Typography>
                                ) : (
                                  <Typography variant="caption" fontWeight={800} color="warning.main">
                                    Sem código de barras
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    {visibleProducts.length < allProducts.length && (
                      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                        <Typography variant="caption">
                          Role para baixo para carregar mais produtos ({visibleProducts.length} de {allProducts.length}).
                        </Typography>
                      </Box>
                    )}
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          )}
        </Stack>
      </AppLayout>
    </ProtectedRoute>
  );
}

(EtiquetasPorMarcaPage as any).usesAppLayout = true;
