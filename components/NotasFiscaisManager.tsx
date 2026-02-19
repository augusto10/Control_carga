import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText,
  DialogActions, 
  IconButton, 
  Tooltip, 
  CircularProgress,
  InputAdornment,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { NumericFormat } from 'react-number-format';

// Types
type StatusNota = 'pendente' | 'processando' | 'concluido' | 'erro';

interface NotaFiscal {
  id: string;
  codigo: string;
  numero: string;
  volumes: string;
  status: StatusNota;
  dataHora: string;
  editando?: boolean;
}

const NotasFiscaisManager: React.FC = () => {
  // States
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [notaEditando, setNotaEditando] = useState<NotaFiscal | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [erro, setErro] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form states
  const [codigo, setCodigo] = useState('');
  const [numero, setNumero] = useState('');
  const [volumes, setVolumes] = useState('1');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControls = useRef<IScannerControls | null>(null);
  
  // Hooks
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Efeitos
  useEffect(() => {
    // Limpar scanner ao desmontar
    return () => {
      if (scannerControls.current) {
        scannerControls.current.stop();
        scannerControls.current = null;
      }
    };
  }, []);
  
  // Funções auxiliares
  const formatarVolumes = (quantidade: number): string => {
    return `${quantidade} volume${quantidade !== 1 ? 's' : ''}`;
  };
  
  const validarCodigoBarras = (codigo: string): { valido: boolean; mensagem?: string } => {
    if (!codigo.trim()) {
      return { valido: false, mensagem: 'O código não pode estar vazio' };
    }
    
    // Validação para DANFE (44 dígitos)
    if (/^\d{44}$/.test(codigo)) {
      return { valido: true };
    }
    
    // Validação para códigos curtos (até 20 caracteres)
    if (codigo.length <= 20) {
      return { valido: true };
    }
    
    // Validação para códigos com hífen
    if (/^[A-Za-z0-9-]+$/.test(codigo)) {
      return { valido: true };
    }
    
    return { 
      valido: false, 
      mensagem: 'Formato inválido. Use apenas números, letras ou hífen.' 
    };
  };
  
  // Funções de manipulação de notas
  const adicionarNota = useCallback(() => {
    const novaNota: NotaFiscal = {
      id: Date.now().toString(),
      codigo,
      numero,
      volumes,
      status: 'pendente',
      dataHora: new Date().toISOString(),
      editando: true
    };
    
    setNotas(prev => [...prev, novaNota]);
    setCodigo('');
    setNumero('');
    setVolumes('1');
    
    enqueueSnackbar('Nota adicionada com sucesso!', { variant: 'success' });
  }, [codigo, numero, volumes, enqueueSnackbar]);
  
  const removerNota = (id: string) => {
    setNotas(prev => prev.filter(nota => nota.id !== id));
    enqueueSnackbar('Nota removida', { variant: 'info' });
  };
  
  const salvarNotas = async () => {
    try {
      setIsSaving(true);
      // Implementar lógica de salvamento
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulação
      enqueueSnackbar('Notas salvas com sucesso!', { variant: 'success' });
      setNotas([]);
    } catch (error) {
      enqueueSnackbar('Erro ao salvar notas', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Funções do scanner
  const iniciarScanner = async () => {
    try {
      setIsScanning(true);
      setErro('');
      
      if (!videoRef.current) {
        throw new Error('Elemento de vídeo não encontrado');
      }
      
      const codeReader = new BrowserMultiFormatReader();
      
      scannerControls.current = await codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const codigoLido = result.getText();
            setCodigo(codigoLido);
            setShowScanner(false);
            setIsScanning(false);
            
            if (scannerControls.current) {
              scannerControls.current.stop();
              scannerControls.current = null;
            }
            
            enqueueSnackbar('Código lido com sucesso!', { variant: 'success' });
          }
          
          if (error && !(error as any).stopped) {
            console.error('Erro ao ler código:', error);
          }
        }
      );
      
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error);
      setErro('Não foi possível acessar a câmera. Verifique as permissões.');
      setIsScanning(false);
    }
  };
  
  const pararScanner = () => {
    if (scannerControls.current) {
      scannerControls.current.stop();
      scannerControls.current = null;
    }
    setShowScanner(false);
    setIsScanning(false);
  };
  
  // Cálculo do total de volumes
  const totalVolumes = useMemo(() => {
    return notas.reduce((total, nota) => {
      return total + (parseInt(nota.volumes) || 0);
    }, 0);
  }, [notas]);
  
  // Renderização
  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
      {/* Cabeçalho */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Gerenciar Notas Fiscais
        </Typography>
        
        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowScanner(true)}
            startIcon={<QrCodeScannerIcon />}
            sx={{ mr: 1 }}
          >
            Ler Código
          </Button>
          
          <Button
            variant="contained"
            color="secondary"
            onClick={salvarNotas}
            disabled={notas.length === 0 || isSaving}
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {isSaving ? 'Salvando...' : 'Salvar Tudo'}
          </Button>
        </Box>
      </Box>
      
      {/* Formulário de adição */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Adicionar Nota Fiscal
        </Typography>
        
        <Box component="form" onSubmit={(e) => { e.preventDefault(); adicionarNota(); }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Código de Barras"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              fullWidth={isMobile}
              sx={{ flex: 2, minWidth: 200 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title="Ler código de barras">
                      <IconButton onClick={() => setShowScanner(true)} edge="end">
                        <QrCodeScannerIcon />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            
            <TextField
              label="Número da Nota"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              required
              fullWidth={isMobile}
              sx={{ flex: 1, minWidth: 150 }}
            />
            
            <TextField
              label="Volumes"
              type="number"
              value={volumes}
              onChange={(e) => setVolumes(e.target.value)}
              inputProps={{ min: 1 }}
              fullWidth={isMobile}
              sx={{ flex: 1, minWidth: 150 }}
            />
            
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              disabled={!numero.trim()}
              sx={{ height: 56 }}
            >
              Adicionar
            </Button>
          </Box>
        </Box>
      </Paper>
      
      {/* Lista de notas */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Notas Fiscais ({notas.length})
          </Typography>
          
          <Box>
            <Typography variant="subtitle1" color="primary">
              Total: {totalVolumes} volume{totalVolumes !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>
        
        {notas.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="textSecondary">
              Nenhuma nota adicionada. Use o formulário acima para adicionar notas.
            </Typography>
          </Box>
        ) : (
          <List>
            {notas.map((nota, index) => (
              <React.Fragment key={nota.id}>
                <ListItem 
                  sx={{ 
                    bgcolor: index % 2 === 0 ? 'action.hover' : 'background.paper',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemText
                    primary={`Nota: ${nota.numero}`}
                    secondary={`Código: ${nota.codigo || 'N/A'} • Volumes: ${nota.volumes}`}
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => setNotaEditando(nota)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    
                    <IconButton 
                      edge="end" 
                      onClick={() => removerNota(nota.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      {/* Diálogo do Scanner */}
      <Dialog 
        open={showScanner} 
        onClose={pararScanner}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <span>Ler Código de Barras</span>
            <IconButton onClick={pararScanner}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {erro ? (
            <Box textAlign="center" p={4}>
              <Typography color="error" gutterBottom>
                {erro}
              </Typography>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={iniciarScanner}
                startIcon={<QrCodeScannerIcon />}
              >
                Tentar Novamente
              </Button>
            </Box>
          ) : (
            <Box 
              sx={{ 
                position: 'relative',
                width: '100%',
                height: 300,
                backgroundColor: 'black',
                borderRadius: 1,
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              {isScanning ? (
                <>
                  <video 
                    ref={videoRef} 
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  <Box 
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      border: '2px solid',
                      borderColor: 'primary.main',
                      borderRadius: 1,
                      pointerEvents: 'none',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { borderColor: 'primary.main' },
                        '50%': { borderColor: 'primary.dark' },
                        '100%': { borderColor: 'primary.main' }
                      }
                    }}
                  >
                    <Box 
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'white',
                        textAlign: 'center',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        px: 2,
                        py: 1,
                        borderRadius: 1
                      }}
                    >
                      <QrCodeScannerIcon fontSize="large" />
                      <Typography variant="body2">
                        Posicione o código de barras na área destacada
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={iniciarScanner}
                  startIcon={<QrCodeScannerIcon />}
                  size="large"
                >
                  Iniciar Leitor
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={pararScanner} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Diálogo de Edição */}
      <Dialog 
        open={!!notaEditando} 
        onClose={() => setNotaEditando(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Nota Fiscal</DialogTitle>
        
        <DialogContent>
          {notaEditando && (
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Código de Barras"
                value={notaEditando.codigo}
                onChange={(e) => setNotaEditando({...notaEditando, codigo: e.target.value})}
                fullWidth
                margin="normal"
              />
              
              <TextField
                label="Número da Nota"
                value={notaEditando.numero}
                onChange={(e) => setNotaEditando({...notaEditando, numero: e.target.value})}
                required
                fullWidth
                margin="normal"
              />
              
              <TextField
                label="Volumes"
                type="number"
                value={notaEditando.volumes}
                onChange={(e) => 
                  setNotaEditando({...notaEditando, volumes: e.target.value})
                }
                inputProps={{ min: 1 }}
                fullWidth
                margin="normal"
              />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setNotaEditando(null)} color="inherit">
            Cancelar
          </Button>
          
          <Button 
            onClick={() => {
              if (notaEditando) {
                setNotas(notas.map(n => 
                  n.id === notaEditando.id ? { ...notaEditando } : n
                ));
                setNotaEditando(null);
                enqueueSnackbar('Nota atualizada com sucesso!', { variant: 'success' });
              }
            }}
            color="primary"
            variant="contained"
            startIcon={<CheckIcon />}
          >
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NotasFiscaisManager;
