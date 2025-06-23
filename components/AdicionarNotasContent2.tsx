import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton, 
  Tooltip, 
  CircularProgress,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  QrCodeScanner as QrCodeScannerIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { BrowserMultiFormatReader } from '@zxing/browser';

// Tipos
type NotaAdicionada = {
  codigo: string;
  numeroNota: string;
  valor: string;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  dataHora: string;
};

type NotaEmEdicao = {
  index: number;
  numero: string;
  valor: string;
};

// Componente de input de moeda
const CurrencyInput = ({
  value,
  onChange,
  label,
  fullWidth = false,
  size = 'medium' as 'small' | 'medium',
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, '');
    
    // Formata como moeda brasileira
    valor = (Number(valor) / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    onChange(valor);
  };

  return (
    <TextField
      label={label}
      value={value}
      onChange={handleChange}
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      InputProps={{
        startAdornment: <InputAdornment position="start">R$</InputAdornment>,
      }}
      inputProps={{
        inputMode: 'decimal',
      }}
    />
  );
};

const AdicionarNotasContent: React.FC = () => {
  // Estados
  const [notas, setNotas] = useState<NotaAdicionada[]>([]);
  const [notaAdicionada, setNotaAdicionada] = useState<number | null>(null);
  const [notaEmEdicao, setNotaEmEdicao] = useState<NotaEmEdicao | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerAtivo, setScannerAtivo] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para o formulário de adição manual
  const [manualCodigo, setManualCodigo] = useState('');
  const [manualNumero, setManualNumero] = useState('');
  const [manualValor, setManualValor] = useState('0,00');
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<any>(null);
  
  // Hooks
  const { enqueueSnackbar } = useSnackbar();
  
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

  // Inicia o scanner quando o componente for montado
  useEffect(() => {
    return () => {
      // Limpa o scanner quando o componente for desmontado
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Função para iniciar o scanner
  const iniciarScanner = useCallback(async () => {
    try {
      setScannerAtivo(true);
      setErro('');
      
      // Solicita permissão para acessar a câmera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
      }

    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      setErro('Não foi possível acessar a câmera. Verifique as permissões.');
      setScannerAtivo(false);
    }
  }, []);

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

  // Renderização do componente
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
          {erro && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {erro}
            </Typography>
          )}
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
};

export default AdicionarNotasContent;
