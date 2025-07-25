import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress,
  TextField,
  IconButton,
  InputAdornment,
  useTheme,
  useMediaQuery,
  keyframes,
  SxProps,
  Theme
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface NotaFiscal {
  id: string;
  codigo: string;
  numeroNota: string;
  volumes: string;
  isScanned: boolean;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  dataHora: string;
  editando?: boolean;
}

interface AdicionarNotasParaControleProps {
  onNotasChange?: (notas: NotaFiscal[]) => void;
}

const AdicionarNotasParaControle: React.FC<AdicionarNotasParaControleProps> = ({ onNotasChange }) => {
  // Estados
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [notaEditandoValor, setNotaEditandoValor] = useState<string | null>(null);
  
  // Ref para o campo de entrada do scanner
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Sempre que notas mudar, dispara callback se existir
  useEffect(() => {
    if (onNotasChange) {
      onNotasChange(notas);
    }
  }, [notas, onNotasChange]);

  // Funções auxiliares (copiadas do AdicionarNotasContent original)
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
    // Remove espaços e caracteres não numéricos
    const codigoLimpo = codigo.replace(/[^\d]/g, '');
    
    // Formato DANFE (44 dígitos) - Número da nota está entre as posições 25 e 34 (9 dígitos)
    if (codigoLimpo.length === 44) {
      // Extrai os 9 dígitos do número da nota (posições 25 a 34, 0-based)
      return codigoLimpo.substring(25, 34);
    }
    
    // Para códigos mais longos que 44 dígitos, tenta encontrar o padrão DANFE
    if (codigoLimpo.length > 44) {
      // Procura por um bloco de 44 dígitos no código
      for (let i = 0; i <= codigoLimpo.length - 44; i++) {
        const bloco = codigoLimpo.substring(i, i + 44);
        // Verifica se o bloco começa com 8 ou 9 (indicando DANFE)
        if (['8', '9'].includes(bloco[0])) {
          return bloco.substring(25, 34);
        }
      }
    }
    
    // Código com hífen (ex: 123-4567890123)
    if (codigo.includes('-')) {
      const partes = codigo.split('-');
      // Retorna a parte após o hífen, removendo qualquer caractere não numérico
      return partes[1] ? partes[1].replace(/[^\d]/g, '') : '';
    }
    
    // Se for um código curto (até 20 dígitos), retorna o próprio código
    if (codigoLimpo.length <= 20) {
      return codigoLimpo;
    }
    
    // Se não se encaixar em nenhum formato conhecido, retorna os últimos 9 dígitos
    return codigoLimpo.slice(-9);
  };

  // Função para processar código de barras (baseada no AdicionarNotasContent original)
  const processarCodigoBarras = useCallback(async (codigo: string) => {
    if (!codigo.trim()) return;
    
    // Limpar espaços em branco extras e caracteres especiais
    const codigoLimpo = codigo.trim();
    
    console.log('Processando código de barras:', codigoLimpo);
    
    const validacao = validarCodigoBarras(codigoLimpo);
    if (!validacao.valido) {
      const mensagemErro = validacao.erro || 'Código de barras inválido';
      console.warn(mensagemErro, codigoLimpo);
      setErro(mensagemErro);
      enqueueSnackbar(mensagemErro, { 
        variant: 'error',
        autoHideDuration: 5000,
        preventDuplicate: true
      });
      return;
    }
    
    setLoading(true);
    setErro('');
    
    try {
      const codigoLimpo = codigo.trim();
      console.log('Código limpo:', codigoLimpo);
      
      // Extrai o número da nota do código de barras
      const numeroNota = extrairNumeroNota(codigoLimpo);
      console.log('Número da nota extraído:', numeroNota);
      
      if (!numeroNota) {
        throw new Error('Não foi possível extrair o número da nota do código de barras');
      }
      
      // Formata o número da nota para exibição (remove zeros à esquerda)
      const numeroNotaFormatado = numeroNota.replace(/^0+/, '');
      
      // Verificar se a nota já foi adicionada (verifica tanto por código quanto por número da nota)
      const notaExistente = notas.find(n => 
        (n.codigo && codigoLimpo && n.codigo === codigoLimpo) ||
        (n.numeroNota && n.numeroNota === numeroNotaFormatado)
      );
      
      if (notaExistente) {
        enqueueSnackbar('Nota já escaneada anteriormente', { 
          variant: 'warning',
          autoHideDuration: 4000,
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
        return;
      }
      
      // Criar nova nota escaneada com volumes
      const novaNota: NotaFiscal = {
        id: Date.now().toString(),
        codigo: codigoLimpo,
        numeroNota: numeroNotaFormatado, // Usa o número formatado (sem zeros à esquerda)
        volumes: '1', // Valor padrão de volumes
        isScanned: true, // Marca como nota escaneada
        status: 'pendente',
        dataHora: new Date().toLocaleString('pt-BR'),
        editando: true // Abre para edição dos volumes
      };
      
      // Define esta nota como a que está sendo editada
      setNotaEditandoValor(novaNota.id);
      
      console.log('Nova nota a ser adicionada:', novaNota);
      
      // Adicionar à lista de notas
      setNotas(prev => {
        const novasNotas = [...prev, novaNota];
        console.log('Lista de notas atualizada:', novasNotas);
        return novasNotas;
      });
      
      // Mostrar mensagem de sucesso com o número da nota formatado
      enqueueSnackbar(`Nota ${numeroNotaFormatado} adicionada com sucesso!`, { 
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Rolar até a nota recém-adicionada
      setTimeout(() => {
        const notaElement = document.querySelector(`[data-nota-id="${novaNota.id}"]`);
        if (notaElement) {
          notaElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
      
      // Focar no campo de entrada para a próxima leitura
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 200);
      
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
  }, [notas, enqueueSnackbar]);

  const handleEditarNota = (index: number) => {
    setNotas(prev => {
      const novasNotas = [...prev];
      novasNotas[index] = { ...novasNotas[index], editando: true };
      return novasNotas;
    });
    setNotaEditandoValor(notas[index].id);
  };

  const handleCancelarEdicao = (index: number) => {
    setNotas(prev => {
      const novasNotas = [...prev];
      novasNotas[index] = { ...novasNotas[index], editando: false };
      return novasNotas;
    });
    setNotaEditandoValor(null);
  };

  const handleSalvarEdicao = (index: number) => {
    setNotas(prev => {
      const novasNotas = [...prev];
      novasNotas[index] = { ...novasNotas[index], editando: false };
      return novasNotas;
    });
    setNotaEditandoValor(null);
    enqueueSnackbar('Nota atualizada!', { variant: 'success' });
  };

  const handleRemoverNota = (index: number) => {
    setNotas(prev => prev.filter((_, i) => i !== index));
    enqueueSnackbar('Nota removida', { variant: 'info' });
  };

  // Atualizar volumes de uma nota
  const atualizarVolumesNota = (id: string, volumes: string) => {
    setNotas(prevNotas => 
      prevNotas.map(nota => 
        nota.id === id ? { ...nota, volumes } : nota
      )
    );
  };

  // Função para processar entrada do scanner
  const handleScannerInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (codigoBarras.trim()) {
        processarCodigoBarras(codigoBarras);
        setCodigoBarras('');
      }
    }
  };

  // Animação para notas em processamento
  const pulseAnimation = keyframes`
    0% { opacity: 0.7; }
    50% { opacity: 0.4; }
    100% { opacity: 0.7; }
  `;
  
  // Efeito para focar e rolar até o campo de valor quando uma nota for adicionada
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  useEffect(() => {
    if (notaEditandoValor) {
      // Rola até o campo de valor da nota que está sendo editada
      setTimeout(() => {
        const elemento = document.querySelector(`[data-nota-id="${notaEditandoValor}"] .MuiInputBase-input`);
        if (elemento) {
          (elemento as HTMLElement).focus();
          elemento.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
          });
        }
      }, 100);
    } else if (inputRef.current) {
      // Se não houver nota sendo editada, foca no campo de entrada
      inputRef.current.focus();
      
      // Evita rolagem desnecessária no carregamento inicial
      if (!isInitialMount) {
        // Rola suavemente até o campo de entrada apenas quando uma nota é adicionada
        inputRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }
    }
  }, [notaEditandoValor, isInitialMount]);

  useEffect(() => {
    setIsInitialMount(false);
  }, []);

  // Cálculo do total de volumes
  const totalVolumes = useMemo(() => {
    return notas.reduce((total, nota) => {
      return total + (parseInt(nota.volumes) || 0);
    }, 0);
  }, [notas]);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Campo de entrada do scanner */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Scanner de Código de Barras
        </Typography>
        
        <TextField
          ref={inputRef}
          fullWidth
          label="Código de Barras"
          value={codigoBarras}
          onChange={(e) => setCodigoBarras(e.target.value)}
          onKeyDown={handleScannerInput}
          placeholder="Escaneie ou digite o código de barras e pressione Enter"
          disabled={loading}
          error={!!erro}
          helperText={erro || 'Escaneie o código de barras ou digite manualmente'}
          InputProps={{
            endAdornment: loading && (
              <InputAdornment position="end">
                <CircularProgress size={20} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Processando código de barras...
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Lista de notas */}
      <Paper sx={{ p: 3 }}>
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
          <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 4 }}>
            Nenhuma nota adicionada ainda. Use o scanner para adicionar notas.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {notas.map((nota, index) => (
              <Paper 
                key={nota.id}
                elevation={1}
                data-status={nota.status}
                data-nota-id={nota.id}
                sx={{
                  p: 2,
                  borderLeft: '4px solid',
                  borderColor: nota.status === 'erro' ? 'error.main' : 
                              nota.status === 'processando' ? 'warning.main' :
                              nota.status === 'concluido' ? 'success.main' : 'primary.main',
                  borderRadius: 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'background.paper',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    boxShadow: 2,
                  },
                  ...(nota.status === 'processando' ? {
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'warning.light',
                      opacity: 0.1,
                      animation: `${pulseAnimation} 1.5s ease-in-out infinite`,
                      zIndex: 0
                    }
                  } : {})
                } as SxProps<Theme>}
              >
                <Box sx={{ flex: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      NFE {nota.numeroNota}
                    </Typography>
                    <Box 
                      component="span" 
                      sx={{
                        px: 1,
                        py: 0.5,
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                        borderRadius: 1,
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    >
                      {nota.status}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Código: {nota.codigo}
                  </Typography>
                  {notaEditandoValor === nota.id ? (
                    <Box mt={1} mb={1}>
                      <Typography variant="subtitle2" gutterBottom>
                        Digite a quantidade de volumes:
                      </Typography>
                      <TextField
                        label="Volumes"
                        type="number"
                        value={nota.volumes}
                        onChange={(e) => {
                          const valor = e.target.value;
                          setNotas(prev => 
                            prev.map(n => 
                              n.id === nota.id ? { ...n, volumes: valor } : n
                            )
                          );
                        }}
                        autoFocus
                        size="small"
                        sx={{ maxWidth: '120px' }}
                        inputProps={{ min: 1 }}
                      />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
                      Volumes: {nota.volumes}
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {notaEditandoValor === nota.id ? (
                    <>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleSalvarEdicao(index)}
                      >
                        <SaveIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleCancelarEdicao(index)}
                      >
                        <CloseIcon />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton 
                      size="small" 
                      onClick={() => handleEditarNota(index)}
                    >
                      <AddIcon />
                    </IconButton>
                  )}
                  
                  <IconButton 
                    size="small" 
                    color="error"
                    onClick={() => handleRemoverNota(index)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default AdicionarNotasParaControle;
