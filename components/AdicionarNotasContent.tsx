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
import { useStore } from '../store/store';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { NumericFormat } from 'react-number-format';

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

interface CurrencyInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  sx?: any;
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
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [manualNumero, setManualNumero] = useState('');
  const [manualValor, setManualValor] = useState('0,00');
  const [notaEditandoValor, setNotaEditandoValor] = useState<string | null>(null);
  
  // Ref para o campo de entrada do scanner
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { enqueueSnackbar } = useSnackbar();
  const { addNota } = useStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Funções auxiliares
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

  // Função para atualizar os volumes de uma nota
  const atualizarVolumesNota = (id: string, volumes: string) => {
    setNotas(prevNotas => 
      prevNotas.map(nota => 
        nota.id === id ? { ...nota, volumes } : nota
      )
    );
  };

  // Funções de manipulação
  const processarCodigoBarras = useCallback(async (codigo: string) => {
    if (!codigo.trim()) return;
    
    // Limpar espaços em branco extras e caracteres especiais
    codigo = codigo.trim();
    
    console.log('Processando código de barras:', codigo);
    
    const validacao = validarCodigoBarras(codigo);
    if (!validacao.valido) {
      const mensagemErro = validacao.erro || 'Código de barras inválido';
      console.warn(mensagemErro, codigo);
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

  const handleSalvarNota = (index: number) => {
    const notaAtualizada = { ...notas[index] };
    
    // Valida o volume para todas as notas
    if (!notaAtualizada.volumes || isNaN(parseInt(notaAtualizada.volumes)) || parseInt(notaAtualizada.volumes) <= 0) {
      enqueueSnackbar('Informe uma quantidade de volumes válida', { variant: 'error' });
      return;
    }
    
    // Atualiza a nota
    setNotas(prev => {
      const novasNotas = [...prev];
      novasNotas[index] = {
        ...notas[index],
        volumes: notaAtualizada.volumes,
        editando: false
      };
      return novasNotas;
    });
    
    setNotaEditandoValor(null);
    enqueueSnackbar('Nota atualizada com sucesso!', { variant: 'success' });
  };

  const handleAddManual = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualNumero.trim()) {
      enqueueSnackbar('Informe o número da nota', { variant: 'error' });
      return;
    }
    
    // Verifica se a nota já foi adicionada (verifica por número da nota)
    const notaExistente = notas.find(n => n.numeroNota === manualNumero.trim());
    if (notaExistente) {
      enqueueSnackbar('Nota já escaneada anteriormente', { 
        variant: 'warning',
        autoHideDuration: 4000,
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      return;
    }
    
    // Cria uma nova nota manual
    const novaNota: NotaFiscal = {
      id: Date.now().toString(),
      codigo: `MANUAL-${Date.now()}`,
      numeroNota: manualNumero.trim(),
      volumes: '1', // Valor padrão de volumes para notas manuais
      isScanned: false, // Marca como nota manual
      status: 'pendente',
      dataHora: new Date().toLocaleString('pt-BR'),
      editando: true // Abre para edição dos volumes
    };
    
    // Adiciona a nova nota
    setNotas(prev => [...prev, novaNota]);
    setNotaEditandoValor(novaNota.id);
    
    // Limpa o formulário
    setManualNumero('');
    
    enqueueSnackbar(`Nota ${manualNumero} adicionada com sucesso!`, { variant: 'success' });
    
    // Rola até a nota recém-adicionada
    setTimeout(() => {
      const notaElement = document.querySelector(`[data-nota-id="${novaNota.id}"]`);
      if (notaElement) {
        notaElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
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
    if (notas.length === 0) {
      enqueueSnackbar('Nenhuma nota para salvar.', { variant: 'info' });
      return;
    }

    try {
      setIsSaving(true);
      
      // Prepara os dados para envio
      const notasParaEnviar = notas.map(nota => {
        const notaProcessada = {
          ...nota,
          // Garante que volumes seja um número válido
          volumes: (nota.volumes && !isNaN(Number(nota.volumes))) ? String(nota.volumes) : '1'
        };
        console.log('Nota processada para envio:', JSON.stringify(notaProcessada, null, 2));
        return notaProcessada;
      });

      console.log('Dados a serem enviados:', JSON.stringify({ notas: notasParaEnviar }, null, 2));
      
      // 1. Primeiro salva as notas no backend
      const response = await fetch('/api/notas/salvar-multiplas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache': 'no-cache',
          'credentials': 'include'
        },
        body: JSON.stringify({ notas: notasParaEnviar })
      });
      
      console.log('Resposta do servidor (status):', response.status);
      
      const data = await response.json();
      console.log('Resposta do servidor:', data);

      if (!response.ok) {
        // Se for erro de duplicação, mostra a mensagem específica
        if (data.error === 'Nota já escaneada anteriormente' || data.message === 'Nota já escaneada anteriormente') {
          throw new Error('Nota já escaneada anteriormente');
        }
        // Para outros erros, usa a mensagem do servidor ou uma mensagem padrão
        throw new Error(data.error || data.message || 'Erro ao salvar notas');
      }

      // 2. Mostra mensagem de sucesso
      enqueueSnackbar(`Notas salvas com sucesso!`, { 
        variant: 'success',
        autoHideDuration: 3000
      });

      // 3. Limpa as notas locais e reseta o estado
      setNotas([]);
      setNotaEditandoValor(null);
      
      // 4. Mostra mensagem de sucesso
      enqueueSnackbar('Notas salvas com sucesso!', { 
        variant: 'success',
        autoHideDuration: 3000
      });

    } catch (error) {
      console.error('Erro ao salvar notas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar notas';
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000
      });
    } finally {
      setIsSaving(false);
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
          block: 'center' 
        });
      } else {
        // Marca que o carregamento inicial foi concluído
        setIsInitialMount(false);
      }
    }
  }, [notaEditandoValor, notas.length, isInitialMount]); // Executa quando a nota sendo editada ou o número de notas muda

  // Manipulador de teclas para o campo de entrada
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Se a tecla Enter for pressionada, processa o código de barras
    if (e.key === 'Enter' && codigoBarras.trim()) {
      e.preventDefault();
      processarCodigoBarras(codigoBarras);
      setCodigoBarras('');
    }
  };

  // Função para converter valor para número de forma segura
  const converterParaNumero = (valor: any): number => {
    if (valor === null || valor === undefined) return 0;
    
    // Se for número, retorna direto
    if (typeof valor === 'number') return valor;
    
    // Se for string, faz o parse
    if (typeof valor === 'string') {
      // Remove pontos de milhar e troca vírgula por ponto
      const valorLimpo = valor.replace(/\./g, '').replace(',', '.');
      const numero = parseFloat(valorLimpo);
      return isNaN(numero) ? 0 : numero;
    }
    
    // Para outros tipos, tenta converter para número
    return Number(valor) || 0;
  };

  // Calcular total de volumes
  const totalVolumes = useMemo(() => {
    return notas.reduce((total, nota) => {
      return total + (parseInt(nota.volumes) || 0);
    }, 0);
  }, [notas]);

  // Renderização
  const renderListaNotas = () => {
    return (
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Notas a serem salvas <small>({notas.length})</small>
          </Typography>
          {notas.length > 0 && (
            <Box display="flex" gap={2} alignItems="center">
              <Typography variant="subtitle1" color="primary" fontWeight="bold">
                Total de Volumes: {totalVolumes}
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
              <Box sx={{ position: 'relative' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSalvarTodasNotas}
                  disabled={loading || isSaving || notas.length === 0}
                  startIcon={isSaving ? undefined : <SaveIcon />}
                  sx={{
                    minWidth: 180,
                    '&.Mui-disabled': {
                      bgcolor: 'action.disabledBackground',
                      color: 'action.disabled',
                    },
                  }}
                >
                  {isSaving ? 'Salvando...' : `Salvar ${notas.length} Nota${notas.length !== 1 ? 's' : ''}`}
                </Button>
                {isSaving && (
                  <CircularProgress 
                    size={24}
                    sx={{
                      color: 'primary.main',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      marginTop: '-12px',
                      marginLeft: '-12px',
                    }}
                  />
                )}
              </Box>
            </Box>
          )}
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
                        {nota.isScanned ? 'Digite a quantidade de volumes:' : 'Digite o valor da nota:'}
                      </Typography>
                      {nota.isScanned ? (
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
                          inputProps={{
                            min: 1,
                            step: 1,
                            inputMode: 'numeric',
                            pattern: '[0-9]*',
                            style: { textAlign: 'center' }
                          }}
                        />
                      ) : (
                        <TextField
                          label="Volumes"
                          type="number"
                          value={nota.volumes}
                          onChange={(e) => atualizarVolumesNota(nota.id, e.target.value)}
                          autoFocus
                          size="small"
                          sx={{ maxWidth: '120px' }}
                          inputProps={{
                            min: 1,
                            style: { textAlign: 'center' }
                          }}
                        />
                      )}
                      <Box mt={1} display="flex" gap={1}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          onClick={() => handleSalvarNota(index)}
                        >
                          Salvar
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setNotaEditandoValor(null)}
                        >
                          Cancelar
                        </Button>
                      </Box>
                    </Box>
                  ) : (
                    <Box>
                      <Box 
                        onClick={() => setNotaEditandoValor(nota.id)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          cursor: 'pointer',
                          '&:hover': { textDecoration: 'underline' },
                          color: nota.isScanned ? 'primary.main' : 'inherit'
                        }}
                      >
                        <Typography variant="body2">
                          {`${nota.volumes} ${parseInt(nota.volumes) === 1 ? 'volume' : 'volumes'}`}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        {new Date(nota.dataHora).toLocaleString('pt-BR')}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box>
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={() => handleRemoverNota(index)}
                    disabled={isSaving}
                    title="Remover nota"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Box>
      {/* Campo para leitura do scanner óptico */}
      <Paper component="form" onSubmit={handleAddManual} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Leitor de Código de Barras
        </Typography>
        <Box display="flex" gap={2} alignItems="flex-end">
          <TextField
            fullWidth
            label="Aponte o scanner e leia o código"
            variant="outlined"
            value={codigoBarras}
            onChange={(e) => setCodigoBarras(e.target.value)}
            onKeyDown={handleKeyDown}
            inputRef={inputRef}
            disabled={loading || isSaving}
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => {
                      setCodigoBarras('');
                      inputRef.current?.focus();
                    }}
                    edge="end"
                  >
                    <CloseIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={!codigoBarras.trim() || loading || isSaving}
            startIcon={<AddIcon />}
          >
            Adicionar
          </Button>
        </Box>
        <Typography variant="caption" color="textSecondary" display="block" mt={1}>
          Posicione o cursor no campo acima e leia o código com o scanner
        </Typography>
      </Paper>

      {/* Lista de Notas */}
      {renderListaNotas()}



    </Box>
  );
};

export default AdicionarNotasContent;
