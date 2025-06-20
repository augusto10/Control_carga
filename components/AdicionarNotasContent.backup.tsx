import React, { useState, useEffect, FC, useMemo, useRef } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress, 
  TextField, 
  IconButton,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SxProps,
  Theme,
  InputAdornment,
  LinearProgress
} from '@mui/material';
import { useSnackbar, SnackbarKey } from 'notistack';
import { useStore } from '../store/store';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon, 
  Edit as EditIcon,
  QrCodeScanner as BarcodeIcon,
  QrCodeScanner as QrCodeScannerIcon
} from '@mui/icons-material';
import Tooltip from '@mui/material/Tooltip';
import { NumericFormat } from 'react-number-format';
import { BrowserQRCodeReader, Result, IScannerControls } from '@zxing/browser';

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
  // Estados para gerenciamento de notas
  const [notas, setNotas] = useState<NotaAdicionada[]>([]);
  const [notaAdicionada, setNotaAdicionada] = useState<number | null>(null);
  const [notaEmEdicao, setNotaEmEdicao] = useState<{index: number; valor: string; numero: string} | null>(null);
  
  // Estados para controle do formulário
  const [manualCodigo, setManualCodigo] = useState('');
  const [manualNumero, setManualNumero] = useState('');
  const [manualValor, setManualValor] = useState('0,00');
  
  // Estados para controle da interface
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState('');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  
  // Configuração de temas e responsividade
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Hooks do store e notificações
  const { addNota, fetchNotas } = useStore();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  
  // Estado para controle do snackbar de progresso
  const [progressSnackbar, setProgressSnackbar] = useState<SnackbarKey | null>(null);
  const [loadingSnackbarKey, setLoadingSnackbarKey] = useState<SnackbarKey | null>(null);
  
  // Efeito para carregar as notas ao montar o componente
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

  // Efeito para ativar o leitor de código de barras
  useEffect(() => {
    if (showScanner && videoRef.current) {
      const codeReader = new BrowserQRCodeReader();
      
      codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result: Result | null | undefined, error: Error | null | undefined, controls: IScannerControls) => {
          if (result) {
            processarCodigoBarras(result.getText());
            setShowScanner(false);
            controls.stop();
          }
          if (error && error.name !== 'NotFoundError') {
            console.error(error);
          }
        }
      ).then(controls => {
        controlsRef.current = controls;
      }).catch(console.error);

      return () => {
        if (controlsRef.current) {
          controlsRef.current.stop();
          controlsRef.current = null;
        }
      };
    }
  }, [showScanner]);

  // Função para formatar valor monetário
  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(valor);
  };

  // Função para validar código de barras
  const validarCodigoBarras = (codigo: string): { valido: boolean; erro?: string } => {
    const codigoLimpo = codigo.trim();
    
    // Verificar se está vazio
    if (!codigoLimpo) {
      return { valido: false, erro: 'O código de barras não pode estar vazio' };
    }
    
    // Verificar se contém apenas números (para códigos numéricos)
    if (/^\d+$/.test(codigoLimpo)) {
      // Verificar se tem 44 dígitos (formato DANFE)
      if (codigoLimpo.length === 44) {
        return { valido: true };
      }
      
      // Verificar se tem entre 1 e 20 dígitos (para códigos curtos)
      if (codigoLimpo.length >= 1 && codigoLimpo.length <= 20) {
        return { valido: true };
      }
      
      return { 
        valido: false, 
        erro: 'Código inválido. Deve ter 44 dígitos (DANFE) ou até 20 dígitos.' 
      };
    }
    
    // Verificar se é um código com prefixo (ex: 1234-5678)
    if (/^[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(codigoLimpo)) {
      return { valido: true };
    }
    
    // Verificar se é um código alfanumérico (até 50 caracteres)
    if (/^[A-Za-z0-9]{1,50}$/.test(codigoLimpo)) {
      return { valido: true };
    }
    
    return { 
      valido: false, 
      erro: 'Formato de código inválido. Use apenas números, letras ou hífen.' 
    };
  };

  // Função para extrair número da nota de um código de barras
  const extrairNumeroNota = (codigo: string): string => {
    // Se for um código DANFE (44 dígitos), extrair os 9 últimos dígitos
    if (/^\d{44}$/.test(codigo)) {
      return codigo.substring(35, 44);
    }
    
    // Se for um código com hífen, retornar a parte após o hífen
    if (codigo.includes('-')) {
      return codigo.split('-')[1] || '';
    }
    
    // Se for um código curto, retornar o próprio código
    if (codigo.length <= 20) {
      return codigo;
    }
    
    // Para outros formatos, retornar os primeiros 20 caracteres
    return codigo.substring(0, 20);
  };

  // Função para processar o código de barras escaneado ou digitado
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
      const novaNota: NotaAdicionada = {
        codigo: codigoLimpo,
        numeroNota,
        valor: '0,00',
        status: 'pendente',
        dataHora: new Date().toISOString()
      };
      
      // Adicionar à lista de notas
      setNotas(prev => [...prev, novaNota]);
      setNotaAdicionada(notas.length);
      
      // Limpar campos
      setManualCodigo('');
      setManualNumero('');
      setManualValor('0,00');
      
      // Fechar o scanner se estiver aberto
      if (showScanner) {
        setShowScanner(false);
      }
      
      // Rolar para a nota adicionada
      setTimeout(() => {
        const elemento = document.getElementById(`nota-${notas.length}`);
        if (elemento) {
          elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        setNotaAdicionada(null);
      }, 100);
      
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
  
  // Função para adicionar nota manualmente
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualNumero.trim()) {
      enqueueSnackbar('O número da nota é obrigatório', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      return;
    }
    
    // Se não tiver código, usa o número da nota como código
    const codigo = manualCodigo.trim() || manualNumero.trim();
    
    // Verifica se a nota já foi adicionada
    const notaExistente = notas.find(n => 
      n.numeroNota === manualNumero.trim() || n.codigo === codigo
    );
    
    if (notaExistente) {
      enqueueSnackbar('Esta nota já foi adicionada', { 
        variant: 'warning',
        autoHideDuration: 3000
      });
      return;
    }
    
    // Cria a nova nota
    const novaNota: NotaAdicionada = {
      codigo,
      numeroNota: manualNumero.trim(),
      valor: manualValor || '0,00',
      status: 'pendente',
      dataHora: new Date().toISOString()
    };
    
    // Adiciona à lista de notas
    setNotas(prev => [...prev, novaNota]);
    setNotaAdicionada(notas.length);
    
    // Limpa os campos
    setManualCodigo('');
    setManualNumero('');
    setManualValor('0,00');
    
    // Foca no campo de número para próxima nota
    const numeroInput = document.getElementById('manual-numero') as HTMLInputElement;
    if (numeroInput) {
      numeroInput.focus();
    }
    
    // Rola para a nota adicionada
    setTimeout(() => {
      const elemento = document.getElementById(`nota-${notas.length}`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      setNotaAdicionada(null);
    }, 100);
    
    enqueueSnackbar('Nota adicionada com sucesso!', { 
      variant: 'success',
      autoHideDuration: 3000
    });
  };
  
  // Função para editar uma nota existente
  const handleEditarNota = (index: number) => {
    const nota = notas[index];
    if (!nota) return;
    
    setNotaEmEdicao({
      index,
      numero: nota.numeroNota,
      valor: nota.valor || '0,00'
    });
  };
  
  // Função para salvar a edição de uma nota
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
  
  // Função para remover uma nota
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
  
  // Função para salvar todas as notas
  const handleSalvarNotas = async () => {
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
  
  // Calcula o valor total das notas
  const valorTotal = useMemo(() => {
    return notas.reduce((total, nota) => {
      const valorNumerico = parseFloat(nota.valor.replace(/\./g, '').replace(',', '.')) || 0;
      return total + valorNumerico;
    }, 0);
  }, [notas]);

  // Efeito para processar o código de barras quando o scanner estiver ativo
useEffect(() => {
  if (!showScanner || !scannerAtivo) return;

  const codeReader = new BrowserMultiFormatReader();
  let isMounted = true;

  const startScanner = async () => {
    try {
      const videoInputDevices = await codeReader.listVideoInputDevices();
      const deviceId = videoInputDevices[0]?.deviceId;

      if (!deviceId) {
        setErro('Nenhuma câmera encontrada');
        return;
      }

      const videoElement = videoRef.current;
      if (!videoElement) return;

      await codeReader.decodeFromVideoDevice(deviceId, videoElement, (result, error) => {
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
            processarCodigoBarras(text);
          }
        }
      });

    } catch (error) {
      console.error('Erro ao iniciar o scanner:', error);
      setErro('Erro ao iniciar a câmera. Verifique as permissões.');
    }
  };

  startScanner();

  return () => {
    isMounted = false;
    codeReader.reset();
  };
}, [showScanner, scannerAtivo, processarCodigoBarras]);

// Função para fechar o scanner
const handleCloseScanner = useCallback(() => {
  setShowScanner(false);
  setScannerAtivo(false);
  setErro('');

  // Parar o stream de vídeo
  if (videoRef.current && videoRef.current.srcObject) {
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

// Função para processar o código de barras escaneado
const handleBarcodeScanned = useCallback((barcode: string) => {
  if (!barcode.trim()) return;

  // Valida o código de barras
  const validacao = validarCodigoBarras(barcode);
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
    const codigoLimpo = barcode.trim();
    let numeroNota = codigoLimpo;

    // Se for um código DANFE (44 dígitos), extrai o número da nota
    if (/^\d{44}$/.test(codigoLimpo)) {
      numeroNota = codigoLimpo.substring(35, 44);
    }

    // Verifica se a nota já foi adicionada
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

    // Adiciona a nova nota com valor em branco para preenchimento
    const novaNota: NotaAdicionada = {
      codigo: codigoLimpo,
      numeroNota: numeroNota,
      valor: '0,00',
      status: 'pendente',
      dataHora: new Date().toISOString()
    };

    setNotas(prev => [...prev, novaNota]);
    setNotaAdicionada(notas.length);

    // Rola até a nova nota
    setTimeout(() => {
      const elemento = document.getElementById(`nota-${notas.length}`);
      if (elemento) {
        elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      setNotaAdicionada(null);
    }, 100);

    enqueueSnackbar('Nota adicionada com sucesso!', { 
      variant: 'success',
      autoHideDuration: 3000
    });

  } catch (error) {
    console.error('Erro ao adicionar nota:', error);
    enqueueSnackbar('Erro ao adicionar nota. Tente novamente.', { 
      variant: 'error',
      autoHideDuration: 5000
    });
  } finally {
    setLoading(false);
  }
}, []);

  // Lista de Notas
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
          onClick={handleSalvarNotas}
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
                onClick={handleSalvarNotas}
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
                  <Typography 
                    variant="body1" 
                    fontWeight="medium" 
                    sx={{ 
                      minWidth: '100px', 
                      textAlign: 'right',
                      color: nota.valor === '0,00' ? 'error.main' : 'inherit'
                    }}
                  >
                    {formatarMoeda(parseFloat(nota.valor.replace(/\./g, '').replace(',', '.')) || 0)}
                  </Typography>
                  <Tooltip title="Editar valor">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleEditarNota(index)}
                      disabled={loading || isSaving}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover nota">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleRemoverNota(index)}
                      disabled={loading || isSaving}
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
              Nota: {notaEmEdicao?.numero}
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
      
      {/* Estilos de animação */}
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
          0%, 100% { background-color: rgba(211, 47, 47, 0.1); }
          50% { background-color: rgba(211, 47, 47, 0.3); }
        }
      `}</style>
    </Box>
  );
}
          variant: 'success',
          autoHideDuration: 3000
        });
      } else {
        setErro('Formato de código de barras não reconhecido');
      }
      
      // Fecha o scanner após processar o código
      setShowScanner(false);
      
    } catch (error) {
      console.error('Erro ao processar código de barras:', error);
      enqueueSnackbar('Erro ao processar código de barras', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setLoading(false);
    }
  };
  
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
  }, [enqueueSnackbar, fetchNotas]);

  // Foca no campo de número da nota quando o modal do scanner é fechado
  useEffect(() => {
    if (!scannerAberto) {
      // Pequeno atraso para garantir que a animação de fechamento do modal tenha terminado
      const timer = setTimeout(() => {
        const numeroNotaInput = document.getElementById('manual-numero');
        if (numeroNotaInput) {
          numeroNotaInput.focus();
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [scannerAberto]);

  // Efeito para ativar o leitor de código de barras
  useEffect(() => {
    if (showScanner && videoRef.current) {
      const codeReader = new BrowserQRCodeReader();
      
      codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result: Result | null | undefined, error: Error | null | undefined, controls: IScannerControls) => {
          if (result) {
            processarCodigoBarras(result.getText());
            setShowScanner(false);
            controls.stop();
          }
          if (error && error.name !== 'NotFoundError') {
            console.error(error);
          }
        }
      ).then(controls => {
        controlsRef.current = controls;
      }).catch(console.error);

      return () => {
        if (controlsRef.current) {
          controlsRef.current.stop();
          controlsRef.current = null;
        }
      };
    }
  }, [showScanner]);

  // Função para fechar o scanner
  const handleCloseScanner = useCallback(() => {
    setShowScanner(false);
    setScannerAtivo(false);
    setErro('');
    
    // Parar o stream de vídeo
    if (videoRef.current && videoRef.current.srcObject) {
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

  // Efeito para iniciar o scanner quando o modal for aberto
  useEffect(() => {
    if (showScanner) {
      iniciarScanner();
    } else {
      // Limpar ao fechar o modal
      handleCloseScanner();
    }
    
    // Cleanup ao desmontar
    return () => {
      handleCloseScanner();
    };
  }, [showScanner, handleCloseScanner]);

  const handleBarcodeScanned = (barcode: string) => {
    try {
      setLoading(true);
      console.log('Código de barras lido:', barcode);
      
      // Remove espaços em branco e caracteres especiais
      const codigoLimpo = barcode.trim();
      
      // Validação básica do código de barras
      if (!codigoLimpo) {
        enqueueSnackbar('Código de barras vazio', { 
          variant: 'warning',
          autoHideDuration: 3000
        });
        return;
      }
      
      // Verifica se o código está no formato CODIGO;NUMERO
      if (codigoLimpo.includes(';')) {
        const [codigo, numeroNota] = codigoLimpo.split(';').map(s => s.trim());
        
        // Validação dos campos extraídos
        if (!numeroNota) {
          enqueueSnackbar('Número da nota não encontrado no código de barras', { variant: 'warning' });
          return;
        }
        
        // Verifica se a nota já existe
        const notaExistente = notas.find(n => n.numeroNota === numeroNota);
        if (notaExistente) {
          enqueueSnackbar(`Nota ${numeroNota} já foi adicionada`, { variant: 'warning' });
          return;
        }
        
        // Adiciona a nova nota com valor em branco para preenchimento
        const novaNota: NotaAdicionada = {
          codigo: codigo || `NOTA-${Date.now()}`,
          numeroNota: numeroNota,
          valor: '',
          editando: true
        };
        
        const newNotas = [...notas, novaNota];
        setNotas(newNotas);
        setNotaAdicionada(newNotas.length - 1); // Índice da nova nota
        
        // Rola até a nova nota
        setTimeout(() => {
          const novaNotaElement = document.getElementById(`nota-${newNotas.length - 1}`);
          if (novaNotaElement) {
            novaNotaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        // Remove o destaque após a animação
        setTimeout(() => setNotaAdicionada(null), 2000);
        
        enqueueSnackbar(`Nota ${numeroNota} adicionada. Preencha o valor.`, { 
          variant: 'success',
          autoHideDuration: 3000
        });
        
        // Fecha o scanner após adicionar a nota com sucesso
        setScannerAberto(false);
      } else if (/^\d{44}$/.test(codigoLimpo)) {
        // Se for um código de 44 dígitos (formato DANFE)
        const numeroNota = codigoLimpo.substring(25, 34).replace(/^0+/, '');
        const codigo = codigoLimpo.substring(34, 43);
        
        // Verifica se a nota já existe
        const notaExistente = notas.find(n => n.numeroNota === numeroNota);
        if (notaExistente) {
          enqueueSnackbar(`Nota ${numeroNota} já foi adicionada`, { variant: 'warning' });
          return;
        }
        
        // Adiciona a nova nota com valor em branco para preenchimento
        const novaNota: NotaAdicionada = {
          codigo: codigo || `NOTA-${Date.now()}`,
          numeroNota: numeroNota,
          valor: '',
          editando: true
        };
        
        const newNotas = [...notas, novaNota];
        setNotas(newNotas);
        setNotaAdicionada(newNotas.length - 1); // Índice da nova nota
        
        // Rola até a nova nota
        setTimeout(() => {
          const novaNotaElement = document.getElementById(`nota-${newNotas.length - 1}`);
          if (novaNotaElement) {
            novaNotaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        // Remove o destaque após a animação
        setTimeout(() => setNotaAdicionada(null), 2000);
        
        enqueueSnackbar(`Nota ${numeroNota} adicionada. Preencha o valor.`, { 
          variant: 'success',
          autoHideDuration: 3000
        });
        
        // Fecha o scanner após adicionar a nota com sucesso
        setScannerAberto(false);
      } else {
        // Se não estiver em nenhum formato esperado, usa o código inteiro como número da nota
        const numeroNota = codigoLimpo;
        
        // Verifica se a nota já existe
        const notaExistente = notas.find(n => n.numeroNota === numeroNota);
        if (notaExistente) {
          enqueueSnackbar(`Nota ${numeroNota} já foi adicionada`, { variant: 'warning' });
          return;
        }
        
        // Adiciona a nova nota com valor em branco para preenchimento
        const novaNota: NotaAdicionada = {
          codigo: `NOTA-${Date.now()}`,
          numeroNota: numeroNota,
          valor: '',
          editando: true
        };
        
        const newNotas = [...notas, novaNota];
        setNotas(newNotas);
        setNotaAdicionada(newNotas.length - 1); // Índice da nova nota
        
        // Rola até a nova nota
        setTimeout(() => {
          const novaNotaElement = document.getElementById(`nota-${newNotas.length - 1}`);
          if (novaNotaElement) {
            novaNotaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        // Remove o destaque após a animação
        setTimeout(() => setNotaAdicionada(null), 2000);
        
        enqueueSnackbar(`Nota ${numeroNota} adicionada. Preencha o valor.`, { 
          variant: 'success',
          autoHideDuration: 3000
        });
        
        // Fecha o scanner após adicionar a nota com sucesso
        setScannerAberto(false);
      }
    } catch (error) {
      console.error('Erro ao processar código de barras:', error);
      enqueueSnackbar('Erro ao processar código de barras. Verifique o formato e tente novamente.', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    try {
      // Validação do número da nota
      const numeroNota = manualNumero.trim();
      if (!numeroNota) {
        enqueueSnackbar('Informe o número da nota', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        // Foca no campo de número da nota
        const numeroNotaInput = document.getElementById('manual-numero');
        if (numeroNotaInput) {
          numeroNotaInput.focus();
        }
        return;
      }
      
      // Validação do valor
      const valor = manualValor.trim() || '0,00';
      const valorNumerico = parseValor(valor);
      if (isNaN(valorNumerico) || valorNumerico <= 0) {
        enqueueSnackbar('Informe um valor válido para a nota', { 
          variant: 'error',
          autoHideDuration: 3000
        });
        // Foca no campo de valor
        const valorInput = document.getElementById('manual-valor');
        if (valorInput) {
          valorInput.focus();
        }
        return;
      }

      const numeroNotaFormatado = manualNumero.trim();
      const codigoFormatado = manualCodigo.trim();
      const valorFormatado = manualValor.trim() || '0,00';

      // Verifica se a nota já foi adicionada
      const indexNotaExistente = notas.findIndex(nota => nota.numeroNota === numeroNotaFormatado);
      
      if (indexNotaExistente >= 0) {
        // Atualiza a nota existente
        const notasAtualizadas = [...notas];
        notasAtualizadas[indexNotaExistente] = {
          ...notas[indexNotaExistente],
          valor: valorFormatado,
          editando: valorFormatado === '0,00'
        };
        
        setNotas(notasAtualizadas);
        setNotaAdicionada(indexNotaExistente);
        
        enqueueSnackbar(`Nota ${numeroNotaFormatado} atualizada com sucesso`, { 
          variant: 'success',
          autoHideDuration: 3000
        });
      } else {
        // Adiciona uma nova nota
        const novaNota: NotaAdicionada = {
          codigo: codigoFormatado || `MANUAL-${Date.now()}`,
          numeroNota: numeroNotaFormatado,
          valor: valorFormatado,
          editando: valorFormatado === '0,00'
        };

        const newNotas = [...notas, novaNota];
        setNotas(newNotas);
        setNotaAdicionada(newNotas.length - 1);
        
        enqueueSnackbar(`Nota ${numeroNotaFormatado} adicionada com sucesso`, { 
          variant: 'success',
          autoHideDuration: 3000
        });
      }
      
      // Limpa os campos do formulário
      setManualCodigo('');
      setManualNumero('');
      setManualValor('');
      
      // Rola até a nota adicionada/atualizada
      setTimeout(() => {
        const notaElement = document.getElementById(`nota-${notaAdicionada}`);
        if (notaElement) {
          notaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      
      // Remove o destaque após a animação
      setTimeout(() => setNotaAdicionada(null), 2000);
      
      // Foca no campo de número da nota para próxima adição
      const numeroNotaInput = document.getElementById('manual-numero');
      if (numeroNotaInput) {
        numeroNotaInput.focus();
      }
    } catch (error) {
      console.error('Erro ao adicionar nota manual:', error);
      enqueueSnackbar('Ocorreu um erro ao adicionar a nota. Tente novamente.', { 
        variant: 'error',
        autoHideDuration: 5000
      });
    }
  };

  // Função para converter valor em string para número
  const parseValor = (valor: string): number => {
    if (!valor) return 0;
    // Remove pontos de milhar e substitui vírgula por ponto
    return parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;
  };
  
  // Formata o valor para exibição
  const formatarValor = (valor: string): string => {
    if (!valor) return '0,00';
    // Remove tudo que não for número ou vírgula
    const valorLimpo = valor.replace(/[^0-9,]/g, '');
    // Se não tiver vírgula, adiciona ,00
    if (!valorLimpo.includes(',')) {
      return `${valorLimpo},00`;
    }
    // Garante que tem exatamente 2 casas decimais
    const [intPart, decimalPart] = valorLimpo.split(',');
    if (decimalPart.length === 1) return `${intPart},${decimalPart}0`;
    if (decimalPart.length > 2) return `${intPart},${decimalPart.substring(0, 2)}`;
    return valorLimpo;
  };

  const handleSalvarNotas = async () => {
    if (isSaving) return; // Evita múltiplos cliques
    
    // Valida se existem notas para salvar
    if (notas.length === 0) {
      enqueueSnackbar('Adicione pelo menos uma nota antes de salvar', { 
        variant: 'warning',
        autoHideDuration: 3000
      });
      return;
    }
    
    // Valida se todas as notas têm valor preenchido
    const notasSemValor = notas.filter(nota => !nota.valor.trim());
    
    if (notasSemValor.length > 0) {
      // Encontra o primeiro campo sem valor para focar
      const primeiraNotaSemValor = notas.findIndex(nota => !nota.valor.trim());
      
      // Rola até a primeira nota sem valor
      const elementoNota = document.getElementById(`nota-${primeiraNotaSemValor}`);
      if (elementoNota) {
        elementoNota.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Adiciona uma classe de destaque temporária
        elementoNota.classList.add('nota-com-erro');
        setTimeout(() => elementoNota.classList.remove('nota-com-erro'), 2000);
      }
      
      enqueueSnackbar('Preencha todos os valores das notas antes de salvar', { 
        variant: 'error',
        autoHideDuration: 5000
      });
      
      return;
    }
    
    setIsSaving(true);
    setLoading(true);
    
    // Mostra o snackbar de carregamento
    const loadingKey = enqueueSnackbar('Processando...', { 
      variant: 'info',
      persist: true,
      autoHideDuration: null
    });
    setLoadingSnackbarKey(loadingKey);
    
    // Verifica se o usuário está autenticado
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        throw new Error('Sessão expirada ou não autenticada');
      }
    } catch (error) {
      console.error('Erro de autenticação:', error);
      enqueueSnackbar('Sua sessão expirada. Por favor, faça login novamente.', {
        variant: 'error',
        autoHideDuration: 5000
      });
      // Dispara evento para redirecionar para a página de login
      window.dispatchEvent(new Event('unauthorized'));
      return;
    }
    
    // Confirmação antes de salvar
    if (!window.confirm(`Deseja salvar ${notas.length} nota(s) fiscal(is)?`)) {
      setIsSaving(false);
      setLoading(false);
      return;
    }
    
    // Processa as notas em lotes para evitar sobrecarga
    const batchSize = 5;
    const batches = [];
    const notasParaSalvar = [...notas]; // Cria uma cópia para evitar problemas de referência
    
    for (let i = 0; i < notasParaSalvar.length; i += batchSize) {
      const batch = notasParaSalvar.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    const resultados = [];
    let progressSnackbarKey: SnackbarKey | null = null;
    
    for (const [batchIndex, batch] of batches.entries()) {
      // Fecha o snackbar de progresso
      if (progressSnackbarKey) {
        closeSnackbar(progressSnackbarKey);
      }
      
      // Mostra o progresso atual
      progressSnackbarKey = enqueueSnackbar(
        `Salvando notas (${Math.min((batchIndex * batchSize) + batch.length, notas.length)}/${notas.length})...`, 
        { 
          variant: 'info',
          persist: true,
          autoHideDuration: null
        }
      ) as SnackbarKey;
      
      // Processa o lote atual
      const batchResults = await Promise.allSettled(
        batch.map(nota => {
          const valorNumerico = parseFloat(nota.valor.replace(/\./g, '').replace(',', '.'));
          
          return addNota({
            codigo: nota.codigo,
            numeroNota: nota.numeroNota,
            valor: valorNumerico,
          });
        })
      );
      
      resultados.push(...batchResults);
      
      // Fecha a notificação de progresso do lote atual
      if (progressSnackbar) {
        closeSnackbar(progressSnackbar);
        setProgressSnackbar(null);
      }
    }
    
    const sucessos = resultados.filter(r => r.status === 'fulfilled').length;
    const falhas = resultados.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    
    // Fecha a notificação de carregamento
    if (loadingSnackbarKey) {
      closeSnackbar(loadingSnackbarKey);
      setLoadingSnackbarKey(null);
    }
    
    // Mostra mensagens de erro individuais, se houver
    const errosUnicos = new Set<string>();
    falhas.forEach((falha) => {
      if (falha.reason) {
        const errorMessage = falha.reason.message || 'Erro ao salvar nota';
        console.error('Erro ao salvar nota:', falha.reason);
        
        // Trata erros específicos da API
        let mensagemAmigavel = errorMessage;
        if (falha.reason.code === 'DUPLICATE_ENTRY') {
          mensagemAmigavel = 'Esta nota já foi cadastrada anteriormente';
        } else if (errorMessage.includes('network')) {
          mensagemAmigavel = 'Erro de conexão. Verifique sua internet e tente novamente.';
        }
        
        // Evita mensagens de erro duplicadas
        if (!errosUnicos.has(mensagemAmigavel)) {
          errosUnicos.add(mensagemAmigavel);
          enqueueSnackbar(mensagemAmigavel, { 
            variant: 'error',
            autoHideDuration: 5000,
            preventDuplicate: true
          });
        }
      }
    });
    
    // Mostra resumo da operação
    if (falhas.length > 0) {
      enqueueSnackbar(
        `${sucessos} nota(s) salva(s) com sucesso, ${falhas.length} falha(s).`, 
        { 
          variant: sucessos > 0 ? 'warning' : 'error',
          autoHideDuration: 5000,
          preventDuplicate: true
        }
      );
    }
  };

  const handleEditarNota = (index: number) => {
    const nota = notas[index];
    setNotaEmEdicao({
      index,
      valor: nota.valor,
      numero: nota.numeroNota
    });
  };

  const handleSalvarNota = () => {
    if (!notaEmEdicao) return;

    const { index, valor } = notaEmEdicao;
    const valorFormatado = valor || '0,00';
    const valorNumerico = parseFloat(valor.replace(/\./g, '').replace(',', '.')) || 0;

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      enqueueSnackbar('Informe um valor válido para a nota', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      return;
    }

    setNotas(prevNotas =>
      prevNotas.map((nota, i) =>
        i === index ? { ...nota, valor: valorFormatado } : nota
      )
    );
    
    setNotaEmEdicao(null);
    enqueueSnackbar('Valor da nota atualizado com sucesso', { 
      variant: 'success',
      autoHideDuration: 3000
    });
  };

  const handleRemoverNota = (index: number) => {
    const notaRemovida = notas[index];
    setNotas(prevNotas => prevNotas.filter((_, i) => i !== index));
    enqueueSnackbar(`Nota ${notaRemovida.numeroNota} removida`, { 
      variant: 'info',
      autoHideDuration: 3000
    });
  };

  const handleCloseScanner = () => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    setShowScanner(false);
  };

  const valorTotal = useMemo(() => {
    return notas.reduce((total: number, nota: NotaAdicionada) => {
      const valor = parseFloat(nota.valor.replace(/\./g, '').replace(',', '.')) || 0;
      return total + valor;
    }, 0);
  }, [notas]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };
  
  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numeroNota = manualNumero.trim();
    const valor = manualValor.trim() || '0,00';
    
    if (!numeroNota) {
      enqueueSnackbar('Informe o número da nota', { 
        variant: 'error',
        autoHideDuration: 3000
      });
      return;
    }
    
    // Verifica se a nota já existe
    const notaExistente = notas.find(n => n.numeroNota === numeroNota);
    if (notaExistente) {
      enqueueSnackbar(`Nota ${numeroNota} já foi adicionada`, { 
        variant: 'warning',
        autoHideDuration: 3000
      });
      return;
    }
    
    const novaNota: NotaAdicionada = {
      codigo: manualCodigo.trim() || `MANUAL-${Date.now()}`,
      numeroNota: numeroNota,
      valor: valor,
      editando: valor === '0,00'
    };
    
    const newNotas = [...notas, novaNota];
    setNotas(newNotas);
    setNotaAdicionada(newNotas.length - 1);
    
    // Limpa os campos
    setManualCodigo('');
    setManualNumero('');
    setManualValor('0,00');
    
    // Rola até a nova nota
    setTimeout(() => {
      const novaNotaElement = document.getElementById(`nota-${newNotas.length - 1}`);
      if (novaNotaElement) {
        novaNotaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    enqueueSnackbar(`Nota ${numeroNota} adicionada com sucesso`, { 
      variant: 'success',
      autoHideDuration: 3000
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Adicionar Notas Fiscais
      </Typography>

      {/* Formulário de adição manual */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Adicionar Nota Manualmente
        </Typography>
        <Box
          component="form"
          onSubmit={handleAddManual}
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            alignItems: 'flex-start'
          }}
        >
          <TextField
            label="Código (opcional)"
            value={manualCodigo}
            onChange={(e) => setManualCodigo(e.target.value)}
            fullWidth
            size="small"
          />
          <TextField
            label="Número da Nota"
            value={manualNumero}
            onChange={(e) => setManualNumero(e.target.value)}
            required
            fullWidth
            size="small"
            id="manual-numero"
          />
          <CurrencyInput
            label="Valor"
            value={manualValor}
            onChange={setManualValor}
            fullWidth
            size="small"
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            disabled={!manualNumero.trim() || loading || isSaving}
            sx={{ height: '40px', alignSelf: 'flex-end' }}
          >
            Adicionar
          </Button>
        </Box>
      </Paper>

      {/* Botão do scanner */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          onClick={() => setShowScanner(true)}
          disabled={loading || isSaving}
          startIcon={<QrCodeScannerIcon />}
          sx={{
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 3,
            },
            transition: 'all 0.2s ease-in-out',
            height: 48,
          }}
        >
          Ler Código de Barras
        </Button>
      </Box>

      {/* Diálogo do Scanner */}
      <Dialog open={showScanner} onClose={handleCloseScanner} maxWidth="sm" fullWidth>
        <DialogTitle>Escanear Código de Barras</DialogTitle>
        <DialogContent>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
              backgroundColor: '#000'
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseScanner} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lista de Notas */}
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
                onClick={handleSalvarNotas}
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
                  <Typography 
                    variant="body1" 
                    fontWeight="medium" 
                    sx={{ 
                      minWidth: '100px', 
                      textAlign: 'right',
                      color: nota.valor === '0,00' ? 'error.main' : 'inherit'
                    }}
                  >
                    {formatarMoeda(parseFloat(nota.valor.replace(/\./g, '').replace(',', '.')) || 0)}
                  </Typography>
                  <Tooltip title="Editar valor">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleEditarNota(index)}
                      disabled={loading || isSaving}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover nota">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleRemoverNota(index)}
                      disabled={loading || isSaving}
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
              Nota: {notaEmEdicao?.numero}
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
    </Box>
  );
};

export default AdicionarNotasContent;
