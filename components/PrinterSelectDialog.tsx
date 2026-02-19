import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Stack,
  Chip,
  Fade,
  useTheme,
  alpha,
  Grid
} from '@mui/material';
import {
  Print as PrintIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  Devices as DevicesIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const MotionPaper = motion(Paper);
const MotionBox = motion(Box);

interface Printer {
  name: string;
  status: 'online' | 'offline' | 'error';
  driver: string;
  port: string;
}

interface PrinterSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onPrint: (printer: string) => void;
  loading?: boolean;
  etiquetasData?: any;
}

const PrinterSelectDialog: React.FC<PrinterSelectDialogProps> = ({
  open,
  onClose,
  onPrint,
  loading = false,
  etiquetasData,
}) => {
  const theme = useTheme();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [error, setError] = useState<string>('');

  // Carregar lista de impressoras reais detectadas via WMIC
  const loadPrinters = async () => {
    setLoadingPrinters(true);
    setError('');
    try {
      console.log('🔍 [DEBUG] Carregando impressoras do sistema via API...');
      
      // Tentar detectar impressoras via API
      const response = await fetch('/api/impressoras/detectar');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [DEBUG] Impressoras detectadas via API:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          const formattedPrinters: Printer[] = data.map((p: any) => ({
            name: p.name || 'Impressora Desconhecida',
            status: (p.status === 'online' ? 'online' : 'offline') as 'online' | 'offline',
            driver: p.driver || 'Desconhecido',
            port: p.port || 'Desconhecido'
          }));
          
          setPrinters(formattedPrinters);
          const defaultPrinter = formattedPrinters.find((p: Printer) => p.status === 'online') || formattedPrinters[0];
          setSelectedPrinter(defaultPrinter.name);
          return;
        }
      }
      
      // Fallback: Lista de impressoras comuns do Windows
      const fallbackPrinters: Printer[] = [
        { name: 'Brother DCP-8152DN Printer', status: 'online', driver: 'Brother', port: 'USB' },
        { name: 'Microsoft Print to PDF', status: 'online', driver: 'Microsoft', port: 'FILE' },
        { name: 'HP LaserJet Professional P1102w', status: 'online', driver: 'HP', port: 'USB' },
        { name: 'OneNote for Windows 10', status: 'online', driver: 'Microsoft', port: 'USB' },
        { name: 'Microsoft XPS Document Writer', status: 'online', driver: 'Microsoft', port: 'FILE' },
        { name: 'Fax', status: 'offline', driver: 'Windows', port: 'USB' },
        { name: 'Brother MFC-8512DN Printer', status: 'online', driver: 'Brother', port: 'USB' },
        { name: 'Zebra ZD220', status: 'online', driver: 'ZDesigner', port: 'USB' },
      ];
      setPrinters(fallbackPrinters);
      setSelectedPrinter(fallbackPrinters.find(p => p.status === 'online')?.name || fallbackPrinters[0].name);
      
    } catch (err) {
      console.error('💥 [DEBUG] Erro ao carregar impressoras:', err);
      setError('Não foi possível detectar impressoras. Usando configuração padrão.');
      
      const defaultPrinter: Printer = {
        name: 'Impressora Padrão',
        status: 'online',
        driver: 'Sistema',
        port: 'Automático'
      };
      setPrinters([defaultPrinter]);
      setSelectedPrinter('Impressora Padrão');
    } finally {
      setLoadingPrinters(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadPrinters();
    }
  }, [open]);

  const handlePrint = () => {
    if (!selectedPrinter) {
      setError('Selecione uma impressora primeiro');
      return;
    }
    
    onPrint(selectedPrinter);
    onClose();
  };

  const getStatusIcon = (status: Printer['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'offline':
        return <ErrorIcon sx={{ color: 'warning.main', fontSize: 20 }} />;
      case 'error':
        return <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />;
      default:
        return <InfoIcon sx={{ color: 'grey.500', fontSize: 20 }} />;
    }
  };

  const getStatusText = (status: Printer['status']) => {
    switch (status) {
      case 'online':
        return 'Disponível';
      case 'offline':
        return 'Indisponível';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 24px 48px rgba(0,0,0,0.1)'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        px: 3,
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PrintIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>Selecionar Impressora</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Atualizar lista">
            <IconButton onClick={loadPrinters} disabled={loadingPrinters} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Fade in={!!error}>
            <Alert 
              severity="error" 
              variant="standard"
              sx={{ 
                mb: 3,
                borderRadius: '16px',
                backdropFilter: 'blur(12px)',
                backgroundColor: alpha(theme.palette.error.main, 0.15),
                color: theme.palette.error.dark,
                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.error.main,
                },
                boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                fontWeight: 600,
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {loadingPrinters ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body2" color="text.secondary">Detectando impressoras...</Typography>
          </Box>
        ) : (
          <Box>
            {/* Informações das etiquetas */}
            {etiquetasData && (
              <MotionPaper
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                sx={{ 
                  p: 2.5, 
                  mb: 4, 
                  bgcolor: 'rgba(0, 118, 255, 0.03)',
                  border: '1px solid rgba(0, 118, 255, 0.1)',
                  borderRadius: 3
                }}
              >
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700, color: 'primary.main' }}>
                  <HistoryIcon fontSize="small" />
                  Resumo da Impressão
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Nota Fiscal</Typography>
                    <Typography variant="body2" fontWeight={600}>{etiquetasData.numeroNota || '---'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Volumes</Typography>
                    <Typography variant="body2" fontWeight={600}>{etiquetasData.volumes || 1} un</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary" display="block">Cliente</Typography>
                    <Typography variant="body2" fontWeight={600} noWrap>{etiquetasData.cliente || '---'}</Typography>
                  </Grid>
                </Grid>
              </MotionPaper>
            )}

            {/* Lista de impressoras */}
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <DevicesIcon fontSize="small" />
              Impressoras Disponíveis
            </Typography>
            
            <FormControl fullWidth sx={{ mb: 4 }}>
              <InputLabel>Escolha uma impressora</InputLabel>
              <Select
                value={selectedPrinter}
                label="Escolha uma impressora"
                onChange={(e) => setSelectedPrinter(e.target.value)}
                disabled={loadingPrinters}
                sx={{ borderRadius: 3 }}
              >
                {printers
                  .filter(printer => printer.status === 'online')
                  .map((printer) => (
                    <MenuItem key={printer.name} value={printer.name} sx={{ py: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        {getStatusIcon(printer.status)}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{printer.name}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {printer.driver} • {printer.port}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Impressoras offline */}
            {printers.filter(p => p.status !== 'online').length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Não Disponíveis
                </Typography>
                <Stack spacing={1}>
                  {printers
                    .filter(p => p.status !== 'online')
                    .map((printer) => (
                      <Paper 
                        key={printer.name} 
                        variant="outlined" 
                        sx={{ 
                          p: 1.5, 
                          borderRadius: 2, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 2,
                          bgcolor: 'rgba(0,0,0,0.02)',
                          borderColor: 'rgba(0,0,0,0.05)'
                        }}
                      >
                        {getStatusIcon(printer.status)}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" color="text.secondary" fontWeight={500}>{printer.name}</Typography>
                          <Typography variant="caption" color="text.disabled">
                            {getStatusText(printer.status)} • {printer.driver}
                          </Typography>
                        </Box>
                      </Paper>
                    ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <Button onClick={onClose} disabled={loading} sx={{ borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button
          onClick={handlePrint}
          variant="contained"
          disabled={!selectedPrinter || loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />}
          sx={{ 
            borderRadius: 2, 
            px: 4,
            boxShadow: '0 4px 12px rgba(0, 118, 255, 0.2)',
            '&:hover': {
              boxShadow: '0 6px 16px rgba(0, 118, 255, 0.3)',
            }
          }}
        >
          {loading ? 'Imprimindo...' : 'Imprimir Etiquetas'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrinterSelectDialog;
