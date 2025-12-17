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
import PrinterSelectDialog from './PrinterSelectDialog';

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
  impressoEm?: string | null;
  lote?: any;
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
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const [currentLote, setCurrentLote] = useState<EtiquetaLote | null>(null);

  // Debug: monitorar mudanças no estado saving
  useEffect(() => {
    console.log('🔍 [DEBUG] Estado saving mudou para:', saving);
  }, [saving]);

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
        if (Array.isArray(transportadorasData) && transportadorasData.length > 0) {
          setTransportadoras(transportadorasData);
        } else {
          // Fallback com transportadoras padrão se API falhar
          console.warn('Usando transportadoras padrão como fallback');
          setTransportadoras([
            { id: 'ACCERT', descricao: 'ACCERT' },
            { id: 'EXPRESSO_GOIAS', descricao: 'EXPRESSO GOIAS' },
            { id: 'TERCEIRIZADA', descricao: 'TERCEIRIZADA' },
            { id: 'DETAFRA_TRANSPORTES', descricao: 'DETAFRA TRANSPORTES' },
            { id: 'RETIRA_VENDEDOR', descricao: 'RETIRA VENDEDOR' },
            { id: 'RETIRA_CLIENTE', descricao: 'RETIRA CLIENTE' }
          ]);
        }
      } catch (error) {
        console.error('Erro ao carregar transportadoras:', error);
        // Fallback com transportadoras padrão
        setTransportadoras([
          { id: 'ACCERT', descricao: 'ACCERT' },
          { id: 'EXPRESSO_GOIAS', descricao: 'EXPRESSO GOIAS' },
          { id: 'TERCEIRIZADA', descricao: 'TERCEIRIZADA' },
          { id: 'DETAFRA_TRANSPORTES', descricao: 'DETAFRA TRANSPORTES' },
          { id: 'RETIRA_VENDEDOR', descricao: 'RETIRA VENDEDOR' },
          { id: 'RETIRA_CLIENTE', descricao: 'RETIRA CLIENTE' }
        ]);
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
    console.log('🔍 [DEBUG] handleGerar chamado');
    console.log('🔍 [DEBUG] Estado saving:', saving);
    console.log('🔍 [DEBUG] Dados do formulário:', notaData);
    console.log('🔍 [DEBUG] Transportadoras disponíveis:', transportadoras);

    if (saving) {
      console.log('⚠️ [DEBUG] Salvamento em andamento, ignorando clique');
      return;
    }

    // Validações
    const camposObrigatorios = [];
    if (!notaData.numeroNota.trim()) camposObrigatorios.push('Número da Nota');
    if (!notaData.cliente.trim()) camposObrigatorios.push('Cliente');
    if (!notaData.transportadora) camposObrigatorios.push('Transportadora');
    if (!notaData.numeroPedido.trim()) camposObrigatorios.push('Número do Pedido');
    if (!notaData.volumes || notaData.volumes < 1) camposObrigatorios.push('Volumes');

    console.log('🔍 [DEBUG] Campos obrigatórios faltando:', camposObrigatorios);

    if (camposObrigatorios.length > 0) {
      const mensagem = `Preencha os campos obrigatórios: ${camposObrigatorios.join(', ')}`;
      console.log('⚠️ [DEBUG] Validação falhou:', mensagem);
      setSnackbar({ open: true, message: mensagem, severity: 'warning' });
      return;
    }

    console.log('✅ [DEBUG] Validações passaram, iniciando geração...');

    try {
      setSaving(true);
      console.log('🔄 [DEBUG] Estado saving definido para true');

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
        observacoes: notaData.observacoes || undefined,
        criadoPor: 'temp-user',
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
          impressoEm: undefined,
          lote: loteTemporario
        });
      }

      loteTemporario.volumesEtiquetas = volumesEtiquetas;

      console.log('✅ Lote temporário criado:', loteTemporario);
      
      console.log('🔄 [DEBUG] Definindo currentLote...');
      setCurrentLote(loteTemporario);
      
      console.log('🔄 [DEBUG] Abrindo preview...');
      setPreviewOpen(true);

      console.log('🔄 [DEBUG] Enviando notificação de sucesso...');
      setSnackbar({ open: true, message: 'Etiquetas geradas com sucesso! Pronto para imprimir.', severity: 'success' });

      // Limpar formulário
      console.log('🔄 [DEBUG] Limpando formulário...');
      setNotaData({
        codigoBarras: '',
        numeroNota: '',
        cliente: '',
        transportadora: '',
        numeroPedido: '',
        volumes: 1,
        observacoes: ''
      });

      console.log('✅ [DEBUG] Processo concluído com sucesso');

    } catch (error: any) {
      console.error('💥 Erro ao gerar etiquetas:', error);
      setSnackbar({ open: true, message: 'Erro ao gerar etiquetas', severity: 'error' });
    } finally {
      console.log('🔄 [DEBUG] Resetando estado saving para false');
      setSaving(false);
    }
  };

  // Função para gerar ZPL das etiquetas com número do pedido em destaque e logo
  const gerarZPL = (lote: EtiquetaLote): string => {
    let zpl = '';

    // Logo da empresa desenhado diretamente com comandos ZPL (sem download de arquivo)
    // Desenho simplificado do logo ESPLENDOR usando comandos nativos
    zpl += '^FO650,20^GB30,30,2^FS\n'; // Quadrado superior esquerdo
    zpl += '^FO650,20^GB30,15,2^FS\n'; // Linha horizontal
    zpl += '^FO650,25^GB15,30,2^FS\n'; // Linha vertical
    zpl += '^FO650,35^GB30,15,2^FS\n'; // Linha horizontal inferior
    zpl += '^FO665,35^GB15,30,2^FS\n'; // Linha vertical direita
    // Texto "ESPLENDOR" abaixo do logo
    zpl += '^FO640,60^A0N,12,12^FDESPLENDOR^FS\n';
    console.log('🔍 [DEBUG] Logo drawn directly with ZPL commands');

    lote.volumesEtiquetas.forEach(volume => {
      // Início da etiqueta
      zpl += '^XA\n';

      // Configurações da etiqueta (ajustar conforme impressora)
      zpl += '^PW812\n'; // Largura da etiqueta (812 pontos = 3 polegadas)
      zpl += '^LL609\n'; // Comprimento da etiqueta (609 pontos = 2.4 polegadas)

      // Logo da empresa já desenhado acima (canto superior direito)

      // Número do pedido GRANDE em destaque no topo (conforme solicitado)
      const numeroPedidoFormatado = lote.numeroPedido || lote.numeroNota;
      zpl += `^FO50,35^A0N,75,75^FD${numeroPedidoFormatado}^FS\n`;

      // Código de barras Code 128 (baseado no código do volume)
      zpl += `^FO50,125^BCN,80,Y,N,N^FD${volume.codigoVolume}^FS\n`;

      // Nome do cliente (centralizado, fonte menor)
      zpl += `^FO50,225^A0N,28,28^FD${lote.cliente.toUpperCase()}^FS\n`;

      // Volume atual/total (formato X/Y como nas imagens)
      zpl += `^FO50,265^A0N,35,35^FD${volume.indiceVolume}/${volume.totalVolumes}^FS\n`;

      // Transportadora (se não for RETIRA_CLIENTE)
      if (lote.transportadora !== 'RETIRA_CLIENTE') {
        const transportadoraNome = lote.transportadora === 'ACCERT' ? 'ACCERT' :
                                  lote.transportadora === 'EXPRESSO_GOIAS' ? 'EXPRESSO GOIAS' :
                                  lote.transportadora === 'TERCEIRIZADA' ? 'TERCEIRIZADA' :
                                  lote.transportadora === 'DETAFRA_TRANSPORTES' ? 'DETAFRA' :
                                  lote.transportadora === 'RETIRA_VENDEDOR' ? 'RETIRA VENDEDOR' :
                                  lote.transportadora === 'VLOG' ? 'VLOG' :
                                  lote.transportadora;
        
        zpl += `^FO50,305^A0N,25,25^FD${transportadoraNome}^FS\n`;
      }

      // Data no formato brasileiro (canto inferior)
      const dataFormatada = new Date().toLocaleDateString('pt-BR');
      zpl += `^FO50,345^A0N,20,20^FD${dataFormatada}^FS\n`;

      // Número da NF e Pedido (pequeno, canto direito) - mostrando ambos
      zpl += `^FO350,345^A0N,16,16^FDNF: ${lote.numeroNota}^FS\n`;
      if (lote.numeroPedido && lote.numeroPedido.trim()) {
        zpl += `^FO350,365^A0N,16,16^FDPed: ${lote.numeroPedido}^FS\n`;
      }

      // Fim da etiqueta
      zpl += '^XZ\n\n';
    });

    return zpl;
  };

  // Função para imprimir etiquetas
  const handleImprimir = async () => {
    if (!currentLote) return;

    console.log('[Print] Abrindo diálogo de seleção de impressora...');
    setPrinterDialogOpen(true);
  };

  // Função para imprimir com impressora selecionada
  const handlePrintWithPrinter = async (printerName: string) => {
    if (!currentLote) return;

    setSaving(true);
    
    try {
      console.log('[Print] Preparando impressão do navegador para:', printerName);

      // Criar HTML para impressão
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Não foi possível abrir janela de impressão');
      }

      // Gerar HTML das etiquetas
      let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Etiquetas de Transporte</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; background: white; }
            @page { size: 4in 6in; margin: 0; }
            @media print {
              body { margin: 0; padding: 0; }
              .etiqueta { page-break-after: always; }
            }
            .etiqueta {
              width: 4in;
              height: 6in;
              padding: 0.15in;
              display: flex;
              flex-direction: column;
              font-size: 10pt;
              page-break-after: always;
              border: 1px solid #000;
            }
            .header-info {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              margin-bottom: 0.1in;
              border-bottom: 1px solid #000;
              padding-bottom: 0.05in;
            }
            .barcode-section {
              display: flex;
              gap: 0.1in;
              margin-bottom: 0.1in;
            }
            .barcode {
              flex: 0 0 1.2in;
              text-align: center;
              border: 1px solid #000;
              padding: 0.05in;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .barcode svg {
              max-width: 100%;
              height: auto;
              margin: 0 auto;
            }
            .barcode-text {
              font-size: 7pt;
              margin-top: 0.02in;
              font-weight: bold;
            }
            .info-box {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border: 1px solid #000;
              padding: 0.05in;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 9pt;
              margin-bottom: 0.03in;
            }
            .info-label {
              font-weight: bold;
              font-size: 8pt;
            }
            .info-value {
              font-size: 8pt;
            }
            .main-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-around;
              margin: 0.1in 0;
              text-align: center;
            }
            .numero-pedido {
              font-size: 32pt;
              font-weight: bold;
              line-height: 1;
            }
            .cliente {
              font-size: 11pt;
              font-weight: bold;
              margin: 0.05in 0;
            }
            .volume-info {
              display: flex;
              justify-content: space-around;
              align-items: center;
              margin: 0.05in 0;
              border: 1px solid #000;
              padding: 0.05in;
            }
            .volume-number {
              font-size: 18pt;
              font-weight: bold;
            }
            .box-number {
              font-size: 14pt;
              font-weight: bold;
              border: 2px solid #000;
              padding: 0.05in 0.1in;
            }
            .footer-info {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              border-top: 1px solid #000;
              padding-top: 0.05in;
              margin-top: 0.05in;
            }
          </style>
        </head>
        <body>
      `;

      // Adicionar cada etiqueta
      currentLote.volumesEtiquetas.forEach((volume, index) => {
        const transportadoraNome = currentLote.transportadora === 'ACCERT' ? 'ACCERT' :
                                  currentLote.transportadora === 'EXPRESSO_GOIAS' ? 'EXPRESSO GOIAS' :
                                  currentLote.transportadora === 'TERCEIRIZADA' ? 'TERCEIRIZADA' :
                                  currentLote.transportadora === 'DETAFRA_TRANSPORTES' ? 'DETAFRA' :
                                  currentLote.transportadora === 'RETIRA_VENDEDOR' ? 'RETIRA VENDEDOR' :
                                  currentLote.transportadora === 'VLOG' ? 'VLOG' :
                                  currentLote.transportadora;

        const dataAtual = new Date();
        const dataFormatada = dataAtual.toLocaleDateString('pt-BR');
        const horaFormatada = dataAtual.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        // Usar apenas números para o código de barras (Code128 requer formato específico)
        const codigoBarrasNumerico = volume.codigoVolume.replace(/[^0-9]/g, '').substring(0, 12) || volume.indiceVolume.toString().padStart(12, '0');

        htmlContent += `
          <div class="etiqueta">
            <div class="header-info">
              <span>NF: ${currentLote.numeroNota}</span>
              <span>${dataFormatada} ${horaFormatada}</span>
              <span style="font-weight: bold;">${volume.indiceVolume}</span>
            </div>
            
            <div class="barcode-section">
              <div class="barcode">
                <svg id="barcode-${index}"></svg>
                <div class="barcode-text">${codigoBarrasNumerico}</div>
              </div>
              <div class="info-box">
                <div class="info-row">
                  <span class="info-label">PEDIDO:</span>
                  <span class="info-value">${currentLote.numeroPedido}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">CLIENTE:</span>
                  <span class="info-value">${currentLote.cliente.substring(0, 15)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">TRANSP:</span>
                  <span class="info-value">${transportadoraNome.substring(0, 12)}</span>
                </div>
              </div>
            </div>

            <div class="main-content">
              <div class="numero-pedido">${currentLote.numeroPedido}</div>
              <div class="cliente">${currentLote.cliente.toUpperCase().substring(0, 25)}</div>
              <div class="volume-info">
                <div class="volume-number">${volume.indiceVolume}/${volume.totalVolumes}</div>
                <div class="box-number">BOX<br>${volume.indiceVolume}</div>
              </div>
            </div>

            <div class="footer-info">
              <span>Vol: ${volume.indiceVolume}/${volume.totalVolumes}</span>
              <span>${dataFormatada}</span>
              <span>Seq: ${volume.indiceVolume}</span>
            </div>
          </div>
        `;
      });

      htmlContent += `
        <script>
          // Gerar códigos de barras após carregamento
          window.addEventListener('load', function() {
            console.log('Gerando códigos de barras...');
      `;

      // Adicionar script para cada código de barras
      currentLote.volumesEtiquetas.forEach((volume, index) => {
        const codigoBarrasNumerico = volume.codigoVolume.replace(/[^0-9]/g, '').substring(0, 12) || volume.indiceVolume.toString().padStart(12, '0');
        htmlContent += `
            try {
              JsBarcode("#barcode-${index}", "${codigoBarrasNumerico}", {
                format: "CODE128",
                width: 2,
                height: 50,
                displayValue: false,
                margin: 2
              });
            } catch(e) {
              console.error('Erro ao gerar código de barras ${index}:', e);
            }
        `;
      });

      htmlContent += `
            console.log('Códigos de barras gerados com sucesso');
            
            // Aguardar um pouco para garantir que os códigos foram renderizados
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
          });
        </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

    } catch (error) {
      console.error('Erro ao imprimir:', error);
      
      setSnackbar({ 
        open: true, 
        message: `❌ Erro ao imprimir: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 
        severity: 'error' 
      });
    } finally {
      setSaving(false);
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
                  // Mostrar número do pedido em destaque (conforme solicitado)
                  const numeroPedidoFormatado = currentLote.numeroPedido || currentLote.numeroNota;

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
                            {numeroPedidoFormatado}
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
                               currentLote.transportadora === 'VLOG' ? 'VLOG' :
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

      {/* Diálogo de seleção de impressora */}
      <PrinterSelectDialog
        open={printerDialogOpen}
        onClose={() => setPrinterDialogOpen(false)}
        onPrint={handlePrintWithPrinter}
        loading={saving}
        etiquetasData={currentLote}
      />

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
