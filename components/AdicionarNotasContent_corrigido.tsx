import React, { useState, useEffect, FC } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress, 
  TextField, 
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SxProps,
  Theme
} from '@mui/material';
import { useSnackbar } from 'notistack';
import BarcodeScannerComponent from './BarcodeScanner';
import { useStore } from '../store/store';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon, 
  Edit as EditIcon,
  QrCodeScanner as BarcodeIcon 
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { NumericFormat } from 'react-number-format';

interface NotaAdicionada {
  codigo: string;
  numeroNota: string;
  valor: string;
  editando?: boolean;
}

interface CurrencyInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
  autoFocus?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({ label, value, onChange, fullWidth, sx, autoFocus }) => {
  return (
    <NumericFormat
      value={value}
      onValueChange={(v: any) => onChange(v.formattedValue)}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      prefix=""
      customInput={TextField}
      fullWidth={fullWidth}
      sx={sx}
      label={label}
      variant="outlined"
      autoFocus={autoFocus}
    />
  );
};

const AdicionarNotasContent: FC = (): JSX.Element => {
  const [notas, setNotas] = useState<NotaAdicionada[]>([]);
  const [notaAdicionada, setNotaAdicionada] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(true);
  const { addNota, status, fetchNotas } = useStore();
  const { enqueueSnackbar } = useSnackbar();
  const [manualCodigo, setManualCodigo] = useState('');
  const [manualNumero, setManualNumero] = useState('');
  const [manualValor, setManualValor] = useState('');
  
  // Estado para controle da edição de nota
  const [notaEmEdicao, setNotaEmEdicao] = useState<{index: number; valor: string} | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Carrega as notas ao montar o componente
  useEffect(() => {
    const carregarNotas = async () => {
      try {
        setLoading(true);
        await fetchNotas();
      } catch (error) {
        console.error('Erro ao carregar notas:', error);
        enqueueSnackbar('Erro ao carregar notas', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    carregarNotas();
  }, [fetchNotas, enqueueSnackbar]);

  // Efeito para focar no input do leitor quando o scanner estiver aberto
  useEffect(() => {
    if (scannerAberto) {
      const timer = setTimeout(() => {
        const input = document.querySelector('input[type="text"]') as HTMLInputElement;
        if (input) {
          input.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scannerAberto]);

  const handleBarcodeScanned = (result: string) => {
    if (!result || !result.trim()) {
      enqueueSnackbar('Código de barras inválido', { variant: 'error' });
      return;
    }

    const numeroNota = result.trim();
    
    // Verifica se a nota já foi adicionada
    const notaExistente = notas.find(nota => nota.numeroNota === numeroNota);
    
    if (notaExistente) {
      enqueueSnackbar('Esta nota já foi adicionada', { variant: 'info' });
      return;
    }
    
    // Adiciona a nova nota
    const novaNota: NotaAdicionada = {
      codigo: '',
      numeroNota,
      valor: '0,00',
      editando: true
    };
    
    setNotas(prev => [...prev, novaNota]);
    setNotaAdicionada(notas.length);
    
    // Fecha o scanner após adicionar a nota
    setScannerAberto(false);
    
    enqueueSnackbar('Nota adicionada com sucesso', { variant: 'success' });
  };

  const handleAddManual = () => {
    if (!manualNumero.trim()) {
      enqueueSnackbar('Por favor, informe o número da nota', { variant: 'error' });
      return;
    }
    
    const numeroNota = manualNumero.trim();
    const valor = manualValor || '0,00';
    
    // Verifica se a nota já existe
    const notaExistenteIndex = notas.findIndex(nota => nota.numeroNota === numeroNota);
    
    if (notaExistenteIndex >= 0) {
      // Atualiza a nota existente
      setNotas(prev => 
        prev.map((nota, idx) => 
          idx === notaExistenteIndex 
            ? { ...nota, valor, codigo: manualCodigo.trim() } 
            : nota
        )
      );
      enqueueSnackbar('Nota atualizada com sucesso', { variant: 'success' });
    } else {
      // Adiciona uma nova nota
      const novaNota: NotaAdicionada = {
        codigo: manualCodigo.trim(),
        numeroNota,
        valor,
        editando: true
      };
      
      setNotas(prev => [...prev, novaNota]);
      setNotaAdicionada(notas.length);
      enqueueSnackbar('Nota adicionada com sucesso', { variant: 'success' });
    }
    
    // Limpa os campos e foca no campo de número para próxima nota
    setManualNumero('');
    setManualValor('0,00');
    setManualCodigo('');
    
    // Foca no campo de número para próxima nota
    const inputNumero = document.getElementById('manual-numero') as HTMLInputElement;
    if (inputNumero) {
      inputNumero.focus();
    }
  };

  const handleEditarNota = (index: number) => {
    const nota = notas[index];
    if (nota) {
      setNotaEmEdicao({
        index,
        valor: nota.valor || '0,00'
      });
    }
  };

  const salvarEdicaoNota = () => {
    if (!notaEmEdicao) return;
    
    const { index, valor } = notaEmEdicao;
    
    setNotas(prev => 
      prev.map((nota, i) => 
        i === index ? { ...nota, valor: valor || '0,00' } : nota
      )
    );
    
    setNotaEmEdicao(null);
    enqueueSnackbar('Valor da nota atualizado', { variant: 'success' });
  };

  const removerNota = (index: number) => {
    setNotas(prev => prev.filter((_, i) => i !== index));
    enqueueSnackbar('Nota removida', { variant: 'info' });
  };

  const handleSaveAll = async () => {
    if (notas.length === 0) {
      enqueueSnackbar('Nenhuma nota para salvar', { variant: 'warning' });
      return;
    }
    
    try {
      setLoading(true);
      
      // Filtra apenas notas com valor válido
      const notasValidas = notas.filter(nota => {
        const valorNumerico = parseFloat(nota.valor.replace(/\./g, '').replace(',', '.'));
        return !isNaN(valorNumerico) && valorNumerico > 0;
      });
      
      if (notasValidas.length === 0) {
        enqueueSnackbar('Nenhuma nota com valor válido para salvar', { variant: 'error' });
        return;
      }
      
      // Salva as notas em lotes para evitar sobrecarga
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < notasValidas.length; i += batchSize) {
        const batch = notasValidas.slice(i, i + batchSize);
        batches.push(batch);
      }
      
      // Processa os lotes sequencialmente
      for (const batch of batches) {
        await Promise.all(
          batch.map(nota => 
            addNota({
              codigo: nota.codigo,
              numeroNota: nota.numeroNota,
              valor: parseFloat(nota.valor.replace(/\./g, '').replace(',', '.'))
            })
          )
        );
      }
      
      // Remove as notas salvas com sucesso
      setNotas(prev => prev.filter(nota => 
        !notasValidas.some(n => n.numeroNota === nota.numeroNota)
      ));
      
      enqueueSnackbar(`Sucesso ao salvar ${notasValidas.length} nota(s)`, { variant: 'success' });
      
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
      enqueueSnackbar('Erro ao salvar notas. Por favor, tente novamente.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: isMobile ? 1 : 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Adicionar Notas Fiscais
        </Typography>
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSaveAll}
            disabled={loading || notas.length === 0}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ ml: 1 }}
          >
            {loading ? 'Salvando...' : `Salvar (${notas.length})`}
          </Button>
        </Box>
      </Box>
      
      <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={3} mb={3}>
        {/* Seção de Leitor de Código de Barras */}
        <Paper sx={{ p: 3, flex: 1, minWidth: isMobile ? '100%' : 'auto' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Leitor de Código de Barras
            </Typography>
            <Button
              variant="outlined"
              startIcon={<BarcodeIcon />}
              onClick={() => setScannerAberto(true)}
            >
              Abrir Leitor
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Aponte o leitor para o código de barras ou use o teclado numérico
          </Typography>
          
          <Dialog 
            open={scannerAberto} 
            onClose={() => setScannerAberto(false)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>Leitor de Código de Barras</DialogTitle>
            <DialogContent>
              <BarcodeScannerComponent onScan={handleBarcodeScanned} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setScannerAberto(false)} color="primary">
                Fechar
              </Button>
            </DialogActions>
          </Dialog>
        </Paper>
        
        {/* Seção de Adição Manual */}
        <Paper sx={{ p: 3, flex: 1, minWidth: isMobile ? '100%' : 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Adicionar Nota Manualmente
          </Typography>
          <form onSubmit={(e) => { e.preventDefault(); handleAddManual(); }}>
            <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2} mb={2}>
              <TextField
                id="manual-codigo"
                label="Código (opcional)"
                value={manualCodigo}
                onChange={(e) => setManualCodigo(e.target.value)}
                fullWidth={isMobile}
                size="small"
                placeholder="Código interno"
              />
              <TextField
                id="manual-numero"
                label="Número da Nota"
                value={manualNumero}
                onChange={(e) => setManualNumero(e.target.value)}
                fullWidth={isMobile}
                size="small"
                required
                placeholder="Número da NF"
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                  'aria-label': 'Número da Nota Fiscal'
                }}
              />
              <CurrencyInput
                label="Valor"
                value={manualValor}
                onChange={setManualValor}
                fullWidth={isMobile}
              />
            </Box>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              fullWidth={isMobile}
              sx={{ mt: 1 }}
            >
              {notas.some(n => n.numeroNota === manualNumero.trim()) ? 'Atualizar Nota' : 'Adicionar Nota'}
            </Button>
          </form>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Pressione Enter para adicionar
          </Typography>
        </Paper>
      </Box>
      
      {/* Lista de Notas */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Notas a serem salvas <small>({notas.length})</small>
          </Typography>
          {notas.length > 0 && (
            <Button 
              color="error" 
              size="small" 
              onClick={() => setNotas([])}
              disabled={loading}
              startIcon={<DeleteIcon />}
            >
              Limpar Tudo
            </Button>
          )}
        </Box>
        
        {notas.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="textSecondary">
              Nenhuma nota adicionada. Use o leitor de código de barras ou adicione manualmente.
            </Typography>
          </Box>
        ) : (
          <Box>
            {notas.map((nota, index) => (
              <Box 
                key={index}
                id={`nota-${index}`}
                display="flex" 
                justifyContent="space-between" 
                alignItems="center" 
                p={2} 
                borderBottom="1px solid" 
                borderColor="divider"
                sx={{
                  opacity: 0,
                  animation: 'fadeIn 0.3s ease-in forwards',
                  animationDelay: `${index * 50}ms`,
                  position: 'relative',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&.nota-com-erro': {
                    animation: 'pulse 2s infinite, fadeIn 0.3s ease-in forwards',
                    '@keyframes pulse': {
                      '0%': { backgroundColor: 'rgba(211, 47, 47, 0.1)' },
                      '50%': { backgroundColor: 'rgba(211, 47, 47, 0.3)' },
                      '100%': { backgroundColor: 'rgba(211, 47, 47, 0.1)' }
                    }
                  },
                  '&.nota-adicionada': {
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(46, 125, 50, 0.1)',
                      animation: 'highlight 2s ease-out forwards',
                      pointerEvents: 'none',
                      borderRadius: '4px'
                    },
                    '@keyframes highlight': {
                      '0%': { opacity: 0.5, backgroundColor: 'rgba(46, 125, 50, 0.5)' },
                      '100%': { opacity: 0, backgroundColor: 'rgba(46, 125, 50, 0)' }
                    }
                  },
                  '@keyframes fadeIn': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' }
                  }
                }}
                className={notaAdicionada === index ? 'nota-adicionada' : ''}
              >
                <Box>
                  <Typography variant="body1">
                    <strong>Nota:</strong> {nota.numeroNota}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    <strong>Código:</strong> {nota.codigo}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body1" fontWeight="medium" sx={{ minWidth: '100px', textAlign: 'right' }}>
                    R$ {nota.valor || '0,00'}
                  </Typography>
                  <Tooltip title="Editar valor">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleEditarNota(index)}
                      disabled={loading}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover nota">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => removerNota(index)}
                      disabled={loading}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
      
      {/* Diálogo de Edição de Valor */}
      <Dialog open={notaEmEdicao !== null} onClose={() => setNotaEmEdicao(null)}>
        <DialogTitle>Editar Valor da Nota</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, pt: 2 }}>
            <CurrencyInput
              label="Valor"
              value={notaEmEdicao?.valor || '0,00'}
              onChange={(value) => {
                if (notaEmEdicao) {
                  setNotaEmEdicao({ ...notaEmEdicao, valor: value });
                }
              }}
              fullWidth
              autoFocus
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotaEmEdicao(null)}>Cancelar</Button>
          <Button 
            onClick={salvarEdicaoNota} 
            variant="contained" 
            color="primary"
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Status */}
      {status && (
        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Status:
          </Typography>
          <Typography variant="body2" color="textPrimary">
            {status}
          </Typography>
        </Paper>
      )}
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes highlight {
          0% { opacity: 0.5; background-color: rgba(46, 125, 50, 0.5); }
          100% { opacity: 0; background-color: rgba(46, 125, 50, 0); }
        }
        @keyframes pulse {
          0% { background-color: rgba(211, 47, 47, 0.1); }
          50% { background-color: rgba(211, 47, 47, 0.3); }
          100% { background-color: rgba(211, 47, 47, 0.1); }
        }
      `}</style>
    </Box>
  );
};

export default AdicionarNotasContent;
