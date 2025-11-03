import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Divider,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Print as PrintIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { useStore } from '../store/store';
import BarcodeScanner from './BarcodeScanner';

interface EtiquetaLote {
  id: string;
  dataCriacao: string;
  codigoBarras: string;
  numeroNota: string;
  cliente: string;
  transportadora: string;
  numeroPedido: string;
  volumes: number;
  observacoes?: string;
  criadoPor: string;
  volumesEtiquetas: EtiquetaVolume[];
}

interface EtiquetaVolume {
  id: string;
  loteId: string;
  indiceVolume: number;
  totalVolumes: number;
  codigoVolume: string;
  impressoEm?: string;
}

const GerarEtiquetasContent: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { fetchTransportadoras } = useStore();

  // Estados
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentLote, setCurrentLote] = useState<EtiquetaLote | null>(null);

  // Estado para notificações
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' | 'info' }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Dados do formulário
  const [notaData, setNotaData] = useState({
    codigoBarras: '',
    numeroNota: '',
    cliente: '',
    transportadora: '',
    numeroPedido: '',
    volumes: 1,
    observacoes: ''
  });

  // Opções de transportadoras
  const [transportadoras, setTransportadoras] = useState<any[]>([]);

  // Carregar transportadoras ao montar
  useEffect(() => {
    const loadTransportadoras = async () => {
      try {
        const transportadorasData = await fetchTransportadoras();
        if (transportadorasData && Array.isArray(transportadorasData)) {
          setTransportadoras(transportadorasData);
        }
      } catch (error) {
        console.error('Erro ao carregar transportadoras:', error);
        setTransportadoras([]); // Fallback para array vazio
      }
    };

    loadTransportadoras();
  }, [fetchTransportadoras]);

  // Função para lidar com leitura do código de barras
  const handleBarcodeScanned = useCallback((codigo: string) => {
    try {
      console.log('Código de barras lido:', codigo);

      // Tentar extrair dados do código (formato esperado: CODIGO;NUMERO)
      const partes = codigo.split(';');
      if (partes.length >= 2) {
        const codigoBarras = partes[0];
        const numeroNota = partes[1];

        setNotaData(prev => ({
          ...prev,
          codigoBarras,
          numeroNota
        }));

        setScannerOpen(false);
        setSnackbar({ open: true, message: 'Nota fiscal lida com sucesso!', severity: 'success' });
      } else {
        // Se não for o formato esperado, usar como código de barras
        setNotaData(prev => ({
          ...prev,
          codigoBarras: codigo
        }));
        setSnackbar({ open: true, message: 'Código de barras lido. Preencha o número da nota manualmente.', severity: 'info' });
      }
    } catch (error) {
      console.error('Erro ao processar código de barras:', error);
      setSnackbar({ open: true, message: 'Erro ao processar código de barras', severity: 'error' });
    }
  }, []);

  // Função para gerar etiquetas diretamente (sem salvar no banco)
  const handleGerar = () => {
    if (saving) return;

    // Validações
    const camposObrigatorios = [];
    if (!notaData.numeroNota.trim()) camposObrigatorios.push('Número da Nota');
    if (!notaData.cliente.trim()) camposObrigatorios.push('Cliente');
    if (!notaData.transportadora) camposObrigatorios.push('Transportadora');
    if (!notaData.numeroPedido.trim()) camposObrigatorios.push('Número do Pedido');
    if (!notaData.volumes || notaData.volumes < 1) camposObrigatorios.push('Volumes');

    if (camposObrigatorios.length > 0) {
      setSnackbar({ open: true, message: `Preencha os campos obrigatórios: ${camposObrigatorios.join(', ')}`, severity: 'warning' });
      return;
    }

    try {
      setSaving(true);

      console.log('🏷️ Gerando etiquetas diretamente:', notaData);

      // Criar lote temporário para preview e impressão
      const loteTemporario: EtiquetaLote = {
        id: `temp-${Date.now()}`,
        dataCriacao: new Date().toISOString(),
        codigoBarras: notaData.codigoBarras || '',
        numeroNota: notaData.numeroNota,
        cliente: notaData.cliente,
        transportadora: notaData.transportadora as any,
        numeroPedido: notaData.numeroPedido,
        volumes: notaData.volumes,
        observacoes: notaData.observacoes || null,
        criadoPor: 'temp-user',
        criadoPorUser: null as any,
        volumesEtiquetas: []
      };

      // Gerar volumes individuais
      const volumesEtiquetas = [];
      for (let i = 1; i <= notaData.volumes; i++) {
        // Gerar código único para o volume baseado no timestamp e índice
        const timestamp = Date.now();
        const codigoVolume = `${notaData.numeroPedido}-${i.toString().padStart(3, '0')}-${timestamp}`;

        volumesEtiquetas.push({
          id: `vol-${timestamp}-${i}`,
          loteId: loteTemporario.id,
          indiceVolume: i,
          totalVolumes: notaData.volumes,
          codigoVolume,
          impressoEm: null,
          lote: loteTemporario
        });
      }

      loteTemporario.volumesEtiquetas = volumesEtiquetas;

      console.log('✅ Lote temporário criado:', loteTemporario);
      
      setCurrentLote(loteTemporario);
      setPreviewOpen(true);

      setSnackbar({ open: true, message: 'Etiquetas geradas com sucesso! Pronto para imprimir.', severity: 'success' });

      // Limpar formulário
      setNotaData({
        codigoBarras: '',
        numeroNota: '',
        cliente: '',
        transportadora: '',
        numeroPedido: '',
        volumes: 1,
        observacoes: ''
      });

    } catch (error: any) {
      console.error('💥 Erro ao gerar etiquetas:', error);
      setSnackbar({ open: true, message: 'Erro ao gerar etiquetas', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Função para gerar ZPL das etiquetas no padrão das imagens
  const gerarZPL = (lote: EtiquetaLote): string => {
    let zpl = '';

    lote.volumesEtiquetas.forEach(volume => {
      // Início da etiqueta
      zpl += '^XA\n';

      // Configurações da etiqueta (ajustar conforme impressora Zebra ZD-220)
      zpl += '^PW812\n'; // Largura da etiqueta (812 pontos = 3 polegadas)
      zpl += '^LL609\n'; // Comprimento da etiqueta (609 pontos = 2.4 polegadas - mais compacta)

      // Gerar código principal no formato XXX.XXX baseado no número da nota
      const codigoPrincipal = lote.numeroNota.replace(/\D/g, '').slice(0, 6);
      const codigoFormatado = codigoPrincipal.length >= 6 
        ? `${codigoPrincipal.slice(0, 3)}.${codigoPrincipal.slice(3, 6)}`
        : lote.numeroNota.slice(0, 7);

      // Código principal grande (estilo das imagens)
      zpl += `^FO50,30^A0N,60,60^FD${codigoFormatado}^FS\n`;

      // Código de barras Code 128 (baseado no código do volume)
      zpl += `^FO50,100^BCN,80,Y,N,N^FD${volume.codigoVolume}^FS\n`;

      // Nome do cliente (centralizado, fonte menor)
      zpl += `^FO50,200^A0N,28,28^FD${lote.cliente.toUpperCase()}^FS\n`;

      // Volume atual/total (formato X/Y como nas imagens)
      zpl += `^FO50,240^A0N,35,35^FD${volume.indiceVolume}/${volume.totalVolumes}^FS\n`;

      // Transportadora (se não for RETIRA_CLIENTE)
      if (lote.transportadora !== 'RETIRA_CLIENTE') {
        const transportadoraNome = lote.transportadora === 'ACCERT' ? 'ACCERT' :
                                  lote.transportadora === 'EXPRESSO_GOIAS' ? 'EXPRESSO GOIAS' :
                                  lote.transportadora === 'TERCEIRIZADA' ? 'TERCEIRIZADA' :
                                  lote.transportadora === 'DETAFRA_TRANSPORTES' ? 'DETAFRA' :
                                  lote.transportadora === 'RETIRA_VENDEDOR' ? 'RETIRA VENDEDOR' :
                                  lote.transportadora;
        
        zpl += `^FO50,280^A0N,25,25^FD${transportadoraNome}^FS\n`;
      }

      // Data no formato brasileiro (canto inferior)
      const dataFormatada = new Date().toLocaleDateString('pt-BR');
      zpl += `^FO50,320^A0N,20,20^FD${dataFormatada}^FS\n`;

      // Número da NF (pequeno, canto)
      zpl += `^FO400,320^A0N,18,18^FDNF: ${lote.numeroNota}^FS\n`;

      // Fim da etiqueta
      zpl += '^XZ\n\n';
    });

    return zpl;
  };

  // Função para imprimir etiquetas
  const handleImprimir = () => {
    if (!currentLote) return;

    try {
      const zpl = gerarZPL(currentLote);

      // Criar blob e fazer download do arquivo .zpl
      const blob = new Blob([zpl], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiquetas-${currentLote.numeroPedido}-${Date.now()}.zpl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSnackbar({ open: true, message: 'Arquivo ZPL gerado com sucesso! Use uma impressora Zebra para imprimir.', severity: 'success' });
      setPreviewOpen(false);

    } catch (error) {
      console.error('Erro ao gerar arquivo ZPL:', error);
      setSnackbar({ open: true, message: 'Erro ao gerar arquivo de impressão', severity: 'error' });
    }
  };


  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
        Gerar Etiquetas de Transporte
      </Typography>

      {/* Seção de Leitura da Nota */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCodeScannerIcon />
          1. Ler Código de Barras da NF-e
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <TextField
            fullWidth
            label="Código de Barras"
            value={notaData.codigoBarras}
            onChange={(e) => setNotaData(prev => ({ ...prev, codigoBarras: e.target.value }))}
            sx={{ minWidth: 300 }}
          />

          <Button
            variant="outlined"
            onClick={() => setScannerOpen(true)}
            startIcon={<QrCodeScannerIcon />}
            sx={{ minWidth: 200 }}
          >
            Ler Código de Barras
          </Button>
        </Box>

        <TextField
          fullWidth
          label="Número da Nota Fiscal"
          value={notaData.numeroNota}
          onChange={(e) => setNotaData(prev => ({ ...prev, numeroNota: e.target.value }))}
          sx={{ mt: 2 }}
          required
        />
      </Paper>

      {/* Seção de Dados do Cliente */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Dados do Cliente e Transporte
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Cliente"
              value={notaData.cliente}
              onChange={(e) => setNotaData(prev => ({ ...prev, cliente: e.target.value }))}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Transportadora</InputLabel>
              <Select
                value={notaData.transportadora}
                onChange={(e) => setNotaData(prev => ({ ...prev, transportadora: e.target.value }))}
                label="Transportadora"
              >
                {transportadoras.map((transportadora: any) => (
                  <MenuItem key={transportadora.id} value={transportadora.id}>
                    {transportadora.descricao}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Número do Pedido"
              value={notaData.numeroPedido}
              onChange={(e) => setNotaData(prev => ({ ...prev, numeroPedido: e.target.value }))}
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Quantidade de Volumes"
              value={notaData.volumes}
              onChange={(e) => setNotaData(prev => ({ ...prev, volumes: parseInt(e.target.value) || 1 }))}
              inputProps={{ min: 1, max: 50 }}
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Observações"
              value={notaData.observacoes}
              onChange={(e) => setNotaData(prev => ({ ...prev, observacoes: e.target.value }))}
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            onClick={handleGerar}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <PrintIcon />}
            size="large"
          >
            {saving ? 'Gerando...' : 'Gerar Etiquetas'}
          </Button>
        </Box>
      </Paper>

      {/* Diálogo do Scanner */}
      <Dialog
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Leitor de Código de Barras</DialogTitle>
        <DialogContent>
          <BarcodeScanner onScan={handleBarcodeScanned} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScannerOpen(false)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Preview das Etiquetas */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon />
          Preview das Etiquetas
        </DialogTitle>
        <DialogContent>
          {currentLote && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Lote: {currentLote.numeroPedido} - {currentLote.volumes} volumes
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Cliente: {currentLote.cliente} | NF: {currentLote.numeroNota}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Etiquetas a serem impressas:
              </Typography>

              <Grid container spacing={2}>
                {currentLote.volumesEtiquetas.map((volume) => {
                  // Gerar código principal no formato XXX.XXX
                  const codigoPrincipal = currentLote.numeroNota.replace(/\D/g, '').slice(0, 6);
                  const codigoFormatado = codigoPrincipal.length >= 6 
                    ? `${codigoPrincipal.slice(0, 3)}.${codigoPrincipal.slice(3, 6)}`
                    : currentLote.numeroNota.slice(0, 7);

                  return (
                    <Grid item xs={12} sm={6} md={4} key={volume.id}>
                      <Card variant="outlined" sx={{ 
                        border: '2px solid #ddd', 
                        borderRadius: 1,
                        minHeight: 200,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}>
                        <CardContent sx={{ p: 2, textAlign: 'center' }}>
                          {/* Código principal grande */}
                          <Typography variant="h4" sx={{ 
                            fontWeight: 'bold', 
                            fontFamily: 'monospace',
                            mb: 1
                          }}>
                            {codigoFormatado}
                          </Typography>

                          {/* Simulação do código de barras */}
                          <Box sx={{ 
                            height: 40, 
                            background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px)',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="caption" sx={{ 
                              color: 'white', 
                              textShadow: '1px 1px 2px black',
                              fontFamily: 'monospace'
                            }}>
                              {volume.codigoVolume}
                            </Typography>
                          </Box>

                          {/* Nome do cliente */}
                          <Typography variant="body1" sx={{ 
                            fontWeight: 'bold',
                            mb: 1,
                            fontSize: '0.9rem'
                          }}>
                            {currentLote.cliente.toUpperCase()}
                          </Typography>

                          {/* Volume */}
                          <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                            {volume.indiceVolume}/{volume.totalVolumes}
                          </Typography>

                          {/* Transportadora */}
                          {currentLote.transportadora !== 'RETIRA_CLIENTE' && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {currentLote.transportadora === 'ACCERT' ? 'ACCERT' :
                               currentLote.transportadora === 'EXPRESSO_GOIAS' ? 'EXPRESSO GOIAS' :
                               currentLote.transportadora === 'TERCEIRIZADA' ? 'TERCEIRIZADA' :
                               currentLote.transportadora === 'DETAFRA_TRANSPORTES' ? 'DETAFRA' :
                               currentLote.transportadora === 'RETIRA_VENDEDOR' ? 'RETIRA VENDEDOR' :
                               currentLote.transportadora}
                            </Typography>
                          )}

                          {/* Data e NF */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date().toLocaleDateString('pt-BR')}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              NF: {currentLote.numeroNota}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Voltar</Button>
          <Button
            onClick={handleImprimir}
            variant="contained"
            startIcon={<PrintIcon />}
            color="primary"
          >
            Imprimir Etiquetas
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GerarEtiquetasContent;
