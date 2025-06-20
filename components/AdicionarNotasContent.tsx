import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  useTheme,
  useMediaQuery,
  SxProps,
  Theme,
  LinearProgress
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useStore } from '../store/store';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon, 
  Edit as EditIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { NumericFormat } from 'react-number-format';
import { BrowserQRCodeReader, BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';

interface NotaFiscal {
  id: string;
  codigo: string;
  numeroNota: string;
  valor: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  dataHora: string;
  editando?: boolean;
}

interface CurrencyInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  sx?: SxProps<Theme>;
  autoFocus?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  label,
  value,
  onChange,
  fullWidth = true,
  size = 'medium',
  sx,
  autoFocus = false
}) => {
  return (
    <NumericFormat
      value={value}
      onValueChange={(v) => onChange(v.formattedValue)}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      prefix=""
      customInput={TextField}
      fullWidth={fullWidth}
      size={size}
      sx={sx}
      label={label}
      variant="outlined"
      autoFocus={autoFocus}
    />
  );
};

const AdicionarNotasContent: React.FC = () => {
  // Estados
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [manualCodigo, setManualCodigo] = useState('');
  const [manualNumero, setManualNumero] = useState('');
  const [manualValor, setManualValor] = useState('0,00');
  const [notaEmEdicao, setNotaEmEdicao] = useState<{index: number; valor: string} | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  
  // Hooks
  const { enqueueSnackbar } = useSnackbar();
  const { addNota } = useStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Funções auxiliares
  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(valor);
  };

  const validarCodigoBarras = (codigo: string): { valido: boolean; erro?: string } => {
    const codigoLimpo = codigo.trim();
    
    if (!codigoLimpo) {
      return { valido: false, erro: 'O código de barras não pode estar vazio' };
    }
    
    // Código numérico (DANFE ou código curto)
    if (/^\d+$/.test(codigoLimpo)) {
      if (codigoLimpo.length === 44 || (codigoLimpo.length >= 1 && codigoLimpo.length <= 20)) {
        return { valido: true };
      }
      return { 
        valido: false, 
        erro: 'Código inválido. Deve ter 44 dígitos (DANFE) ou até 20 dígitos.' 
      };
    }
    
    // Código com hífen ou alfanumérico
    if (/^[A-Za-z0-9-]{1,50}$/.test(codigoLimpo)) {
      return { valido: true };
    }
    
    return { 
      valido: false,
      erro: 'Formato de código inválido. Use apenas números, letras ou hífen.'
    };
  };

  const extrairNumeroNota = (codigo: string): string => {
    // DANFE (44 dígitos)
    if (/^\d{44}$/.test(codigo)) {
      return codigo.substring(35, 44);
    }
    
    // Código com hífen
    if (codigo.includes('-')) {
      return codigo.split('-')[1] || '';
    }
    
    // Código curto
    if (codigo.length <= 20) {
      return codigo;
    }
    
    return codigo;
  };

  // Funções de manipulação
  const processarCodigoBarras = useCallback(async (codigo: string) => {
    if (!codigo.trim()) return;
    
    const validacao = validarCodigoBarras(codigo);
    if (!validacao.valido) {
      setErro(validacao.erro || 'Código de barras inválido');
      enqueueSnackbar(validacao.erro || 'Código de barras inválido', { 
        variant: 'error',
        autoHideDuration: 5000
      });
      return;
    }
    
    setLoading(true);
    setErro('');
    
    try {
      const codigoLimpo = codigo.trim();
      const numeroNota = extrairNumeroNota(codigoLimpo);
      
      // Verificar se a nota já foi adicionada
      const notaExistente = notas.find(n => 
        n.codigo === codigoLimpo || n.numeroNota === numeroNota
      );
      
      if (notaExistente) {
        enqueueSnackbar('Esta nota já foi adicionada', { 
          variant: 'warning',
          autoHideDuration: 3000
        });
        return;
      }
      
      // Criar nova nota
      const novaNota: NotaFiscal = {
        id: Date.now().toString(),
        codigo: codigoLimpo,
        numeroNota,
        valor: '0,00',
        status: 'pendente',
        dataHora: new Date().toISOString()
      };
      
      // Adicionar à lista de notas
      setNotas(prev => [...prev, novaNota]);
      
      // Fechar o scanner se estiver aberto
      if (showScanner) {
        setShowScanner(false);
      }
      
      enqueueSnackbar('Nota adicionada com sucesso!', { 
        variant: 'success',
        autoHideDuration: 3000
      });
      
    } catch (error) {
      console.error('Erro ao processar código de barras:', error);
      setErro('Erro ao processar código de barras. Tente novamente.');
      enqueueSnackbar('Erro ao processar código de barras', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [notas, showScanner, enqueueSnackbar]);

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    processarCodigoBarras(manualCodigo);
  };

  const handleEditarNota = (index: number) => {
    const nota = notas[index];
    if (!nota) return;
    
    setNotaEmEdicao({ index, valor: nota.valor });
  };

  const handleSalvarNota = () => {
    if (notaEmEdicao === null) return;
    
    const { index, valor } = notaEmEdicao;
    
    setNotas(prev => {
      const novasNotas = [...prev];
      if (novasNotas[index]) {
        novasNotas[index] = {
          ...novasNotas[index],
          valor: valor || '0,00'
        };
      }
      return novasNotas;
    });
    
    setNotaEmEdicao(null);
    enqueueSnackbar('Valor da nota atualizado com sucesso!', { 
      variant: 'success',
      autoHideDuration: 3000
    });
  };

  const handleRemoverNota = (index: number) => {
    const nota = notas[index];
    if (!nota) return;
    
    if (window.confirm(`Tem certeza que deseja remover a nota ${nota.numeroNota}?`)) {
      setNotas(prev => prev.filter((_, i) => i !== index));
      enqueueSnackbar('Nota removida com sucesso!', { 
        variant: 'info',
        autoHideDuration: 3000
      });
    }
  };

  const handleSalvarTodasNotas = async () => {
    if (notas.length === 0) return;
    
    try {
      setIsSaving(true);
      
      // Aqui você faria a chamada para a API para salvar as notas
      // Por enquanto, apenas simulamos um delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Limpa as notas após salvar
      setNotas([]);
      
      enqueueSnackbar(`${notas.length} notas salvas com sucesso!`, { 
        variant: 'success',
        autoHideDuration: 5000
      });
      
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
      enqueueSnackbar('Erro ao salvar notas. Tente novamente.', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFecharScanner = useCallback(() => {
    setShowScanner(false);
    setScannerAtivo(false);
    setErro('');

    // Parar o stream de vídeo
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    // Parar o leitor de códigos de barras
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
  }, []);

  // Efeito para o scanner
  useEffect(() => {
    if (!showScanner) return;
    
    // Ativar o scanner quando o diálogo for aberto
    setScannerAtivo(true);
    setErro('');
    
    const codeReader = new BrowserMultiFormatReader();
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const startScanner = async () => {
      try {
        // Listar dispositivos de vídeo disponíveis
        const videoInputDevices = await codeReader.listVideoInputDevices();
        const deviceId = videoInputDevices[0]?.deviceId;

        if (!deviceId) {
          setErro('Nenhuma câmera encontrada');
          return;
        }

        const videoElement = videoRef.current;
        if (!videoElement) return;

        // Limpar qualquer stream anterior
        if (videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoElement.srcObject = null;
        }

        // Iniciar o scanner
        const controls = await codeReader.decodeFromVideoDevice(
          deviceId, 
          videoElement, 
          (result, error) => {
            if (!isMounted) return;

            if (error) {
              if (error.name !== 'NotFoundException') {
                console.error('Erro ao ler código de barras:', error);
              }
              return;
            }


            if (result) {
              const text = result.getText();
              if (text) {
                console.log('Código lido:', text);
                processarCodigoBarras(text);
              }
            }
          }
        );
        
        // Armazenar controles para limpeza posterior
        controlsRef.current = controls;
        
        // Timeout para verificar se a câmera foi iniciada
        timeoutId = setTimeout(() => {
          if (isMounted && !controls.isStopped() && !videoElement.srcObject) {
            setErro('Não foi possível acessar a câmera. Verifique as permissões.');
          }
        }, 2000);

      } catch (error) {
        console.error('Erro ao iniciar o scanner:', error);
        if (isMounted) {
          setErro('Erro ao iniciar a câmera. Verifique as permissões.');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      
      try {
        // Limpar recursos do scanner
        if (controlsRef.current) {
          controlsRef.current.stop().catch(error => {
            console.warn('Erro ao parar controles do scanner:', error);
          });
          controlsRef.current = null;
        }
        
        // Tentar limpar o codeReader de forma segura
        if (codeReader && typeof codeReader.reset === 'function') {
          try {
            codeReader.reset();
          } catch (error) {
            console.warn('Erro ao resetar codeReader:', error);
          }
        }
        
        // Parar stream de vídeo
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (error) {
              console.warn('Erro ao parar track de vídeo:', error);
            }
          });
          videoRef.current.srcObject = null;
        }
      } catch (error) {
        console.error('Erro durante a limpeza do scanner:', error);
      }
    };
  }, [showScanner, processarCodigoBarras]);

  // Calcular valor total
  const valorTotal = useMemo(() => {
    return notas.reduce((total, nota) => {
      const valorNumerico = parseFloat(nota.valor.replace(/\./g, '').replace(',', '.')) || 0;
      return total + valorNumerico;
    }, 0);
  }, [notas]);

  // Renderização
  const renderListaNotas = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Notas a serem salvas <small>({notas.length})</small>
        </Typography>
        {notas.length > 0 && (
          <Box display="flex" gap={2}>
            <Typography variant="subtitle1" color="primary">
              Total: {formatarMoeda(valorTotal)}
            </Typography>
            <Button 
              color="error" 
              size="small" 
              variant="outlined"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja remover todas as notas?')) {
                  setNotas([]);
                  enqueueSnackbar('Todas as notas foram removidas', { 
                    variant: 'info',
                    autoHideDuration: 3000
                  });
                }
              }}
              disabled={loading || isSaving}
              startIcon={<DeleteIcon />}
            >
              Limpar Tudo
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              onClick={handleSalvarTodasNotas}
              disabled={notas.length === 0 || loading || isSaving}
              startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            >
              {isSaving ? 'Salvando...' : 'Salvar Todas'}
            </Button>
          </Box>
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
              key={nota.id}
              id={`nota-${index}`}
              display="flex" 
              alignItems="center" 
              p={2} 
              mb={1} 
              bgcolor="background.paper"
              borderRadius={1}
              boxShadow={1}
            >
              <Box flexGrow={1}>
                <Typography variant="subtitle2">Nota: {nota.numeroNota}</Typography>
                <Typography variant="body2" color="textSecondary">
                  Código: {nota.codigo}
                </Typography>
                <Typography variant="body1" color="primary" fontWeight="bold">
                  Valor: {nota.valor}
                </Typography>
              </Box>
              <Box>
                <IconButton 
                  size="small" 
                  color="primary" 
                  onClick={() => handleEditarNota(index)}
                  disabled={loading || isSaving}
                >
                  <EditIcon />
                </IconButton>
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={() => handleRemoverNota(index)}
                  disabled={loading || isSaving}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );

  return (
    <Box>
      {/* Formulário de adição manual */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Adicionar Nota Fiscal
        </Typography>
        
        <form onSubmit={handleAddManual}>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Código de Barras"
              value={manualCodigo}
              onChange={(e) => setManualCodigo(e.target.value)}
              fullWidth
              disabled={loading || isSaving}
              InputProps={{
                endAdornment: (
                  <Button 
                    type="button"
                    variant="outlined"
                    onClick={() => setShowScanner(true)}
                    disabled={loading || isSaving}
                    startIcon={<QrCodeScannerIcon />}
                  >
                    Ler Código
                  </Button>
                ),
              }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              disabled={!manualCodigo.trim() || loading || isSaving}
              startIcon={<AddIcon />}
            >
              Adicionar
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Lista de Notas */}
      {renderListaNotas()}

      {/* Diálogo de Edição */}
      <Dialog 
        open={notaEmEdicao !== null} 
        onClose={() => setNotaEmEdicao(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Editar Valor da Nota</DialogTitle>
        <DialogContent>
          <Box sx={{ minWidth: 300, pt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Nota: {notaEmEdicao !== null ? notas[notaEmEdicao.index]?.numeroNota : ''}
            </Typography>
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
          <Button 
            onClick={() => setNotaEmEdicao(null)}
            disabled={loading || isSaving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSalvarNota} 
            variant="contained" 
            color="primary"
            disabled={loading || isSaving}
          >
            {loading ? <CircularProgress size={24} /> : 'Salvar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Scanner de Código de Barras */}
      <Dialog 
        open={showScanner} 
        onClose={handleFecharScanner}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {scannerAtivo ? 'Aponte para o código de barras' : 'Preparando scanner...'}
          </Typography>
          <IconButton
            aria-label="fechar"
            onClick={handleFecharScanner}
            sx={{
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <Box sx={{ 
            position: 'relative',
            width: '100%',
            height: isMobile ? 'calc(100vh - 200px)' : 400,
            backgroundColor: '#000',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            {erro ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="error" gutterBottom>{erro}</Typography>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={() => setScannerAtivo(true)}
                  sx={{ mt: 2 }}
                >
                  Tentar Novamente
                </Button>
              </Box>
            ) : (
              <>
                <video 
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    transform: 'scaleX(-1)' // Espelhar a imagem da câmera
                  }}
                  playsInline
                  autoPlay
                  muted
                />
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: 1,
                  pointerEvents: 'none',
                  boxShadow: 'inset 0 0 0 2000px rgba(0, 0, 0, 0.3)'
                }}>
                  <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '80%',
                    height: '30%',
                    border: '2px solid #fff',
                    borderRadius: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography variant="body2" color="white" align="center" sx={{ mb: 1 }}>
                      Posicione o código de barras aqui
                    </Typography>
                    <Box sx={{ 
                      width: '60%', 
                      height: 2, 
                      backgroundColor: 'white',
                      mt: 1,
                      position: 'relative',
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        top: -4,
                        left: 0,
                        right: 0,
                        height: 2,
                        backgroundColor: 'red',
                        animation: 'scan 2s infinite',
                        '@keyframes scan': {
                          '0%': { top: '0%' },
                          '50%': { top: '100%' },
                          '100%': { top: '0%' }
                        }
                      }
                    }} />
                  </Box>
                </Box>
              </>
            )}
          </Box>
          
          {loading && (
            <Box sx={{ width: '100%', position: 'absolute', top: 0 }}>
              <LinearProgress color="primary" />
            </Box>
          )}
          
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              {scannerAtivo 
                ? 'Aponte a câmera para o código de barras da nota fiscal'
                : 'Iniciando câmera...'}
            </Typography>
            {scannerAtivo && (
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={handleFecharScanner}
                sx={{ mt: 2 }}
                startIcon={<CloseIcon />}
              >
                Cancelar
              </Button>
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdicionarNotasContent;
