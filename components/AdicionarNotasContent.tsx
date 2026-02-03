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
  Theme,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Tooltip,
  Container,
  Avatar
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useStore } from '../store/store';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Save as SaveIcon,
  Close as CloseIcon,
  QrCodeScanner as ScannerIcon,
  Receipt as ReceiptIcon,
  Inventory as InventoryIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { NumericFormat } from 'react-number-format';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionGrid = motion(Grid);

const entranceAnimation = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

interface NotaFiscal {
  id: string;
  codigo: string;
  numeroNota: string;
  volumes: string;
  isScanned: boolean;
  status: 'pendente' | 'processando' | 'concluido' | 'erro';
  dataHora: string;
  editando?: boolean;
  valorPedido?: number;
  razaoSocial?: string;
  pesoBruto?: number;
  dataEmissao?: string;
  cnpj?: string;
  chaveNFe?: string;
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
  
  const extrairChaveNFe = (codigo: string): string | null => {
    const somenteDigitos = codigo.replace(/[^\d]/g, '');
    if (somenteDigitos.length === 44) return somenteDigitos;
    if (somenteDigitos.length > 44) {
      for (let i = 0; i <= somenteDigitos.length - 44; i++) {
        const bloco = somenteDigitos.substring(i, i + 44);
        if (/^\d{44}$/.test(bloco)) {
          return bloco;
        }
      }
    }
    return null;
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
      
      // Extrai o número da nota e possível chave NFe do código de barras
      const numeroNota = extrairNumeroNota(codigoLimpo);
      console.log('Número da nota extraído:', numeroNota);
      const chaveNFe = extrairChaveNFe(codigoLimpo);
      console.log('Chave NFe extraída:', chaveNFe);
      
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

      // Buscar dados na API externa
      let volumesApi = '1';
      let dadosExtras = null;

      try {
        // Notificar usuário que estamos buscando
        enqueueSnackbar('Buscando dados na API externa...', { variant: 'info', autoHideDuration: 1000 });
        
        const urlApi = chaveNFe 
          ? `/api/buscar-nota-externa?chave=${chaveNFe}`
          : `/api/buscar-nota-externa?numero=${numeroNotaFormatado}&serie=1`;
        const response = await fetch(urlApi);
        if (response.ok) {
          const dados = await response.json();
          if (dados.volumes) {
            volumesApi = dados.volumes.toString();
          }
          dadosExtras = dados;
          
          enqueueSnackbar(`Nota encontrada: ${dados.cliente || 'Cliente não identificado'}`, { 
            variant: 'success', 
            autoHideDuration: 3000 
          });
        }
      } catch (err) {
        console.warn('Erro ao buscar na API externa:', err);
        // Não impede o fluxo, apenas segue com volume 1
      }
      
      // Criar nova nota escaneada com volumes
      const novaNota: NotaFiscal = {
        id: Date.now().toString(),
        codigo: codigoLimpo,
        numeroNota: numeroNotaFormatado, // Usa o número formatado (sem zeros à esquerda)
        volumes: volumesApi, // Valor vindo da API ou padrão
        isScanned: true, // Marca como nota escaneada
        status: 'pendente',
        dataHora: new Date().toLocaleString('pt-BR'),
        editando: true, // Abre para edição dos volumes
        chaveNFe: chaveNFe || undefined,
        valorPedido: dadosExtras?.valorPedido ?? dadosExtras?.valor ?? undefined,
        razaoSocial: dadosExtras?.razaoSocial ?? dadosExtras?.cliente ?? undefined,
        pesoBruto: dadosExtras?.pesoBruto ?? dadosExtras?.peso ?? undefined,
        dataEmissao: dadosExtras?.dataEmissao ?? undefined,
        cnpj: dadosExtras?.cnpj ?? undefined
      };
      
      // Define esta nota como a que está sendo editada
      setNotaEditandoValor(novaNota.id);
      
      console.log('Nova nota a ser adicionada:', novaNota);
      
      // Adicionar à lista de notas (no topo)
      setNotas(prev => {
        const novasNotas = [novaNota, ...prev];
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

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Usa codigoBarras como fonte principal se manualNumero estiver vazio, 
    // pois o input principal está ligado a codigoBarras
    const numeroParaAdicionar = manualNumero.trim() || codigoBarras.trim();
    
    if (!numeroParaAdicionar) {
      enqueueSnackbar('Informe o número da nota', { variant: 'error' });
      return;
    }
    
    // Verifica se a nota já foi adicionada (verifica por número da nota)
    const notaExistente = notas.find(n => n.numeroNota === numeroParaAdicionar);
    if (notaExistente) {
      enqueueSnackbar('Nota já escaneada anteriormente', { 
        variant: 'warning',
        autoHideDuration: 4000,
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      return;
    }

    // Buscar dados na API externa
    let volumesApi = '1';
    let dadosExtras = null;
    try {
      enqueueSnackbar('Buscando dados na API externa...', { variant: 'info', autoHideDuration: 1000 });
      const response = await fetch(`/api/buscar-nota-externa?numero=${numeroParaAdicionar}&serie=1`);
      
      if (response.ok) {
        const dados = await response.json();
        if (dados.volumes) {
          volumesApi = dados.volumes.toString();
        }
        dadosExtras = dados;
        enqueueSnackbar(`Nota encontrada: ${dados.cliente || 'Cliente não identificado'}`, { 
          variant: 'success', 
          autoHideDuration: 3000 
        });
      }
    } catch (err) {
      console.warn('Erro ao buscar na API externa:', err);
    }
    
    // Cria uma nova nota manual
    const novaNota: NotaFiscal = {
      id: Date.now().toString(),
      codigo: `MANUAL-${Date.now()}`,
      numeroNota: numeroParaAdicionar,
      volumes: volumesApi, // Valor vindo da API ou padrão
      isScanned: false, // Marca como nota manual
      status: 'pendente',
      dataHora: new Date().toLocaleString('pt-BR'),
      editando: true // Abre para edição dos volumes
    };
    
    // Adiciona a nova nota
    setNotas(prev => [novaNota, ...prev]);
    setNotaEditandoValor(novaNota.id);
    
    // Limpa o formulário
    setManualNumero('');
    setCodigoBarras(''); // Limpa também o código de barras pois usamos ele
    
    if (!dadosExtras) {
      enqueueSnackbar(`Nota ${numeroParaAdicionar} adicionada manualmente`, { variant: 'info' });
    }
    
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
          'Accept': 'application/json'
        },
        credentials: 'include',
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
      <AnimatePresence>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <Card sx={{ 
            borderRadius: 4, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            bgcolor: 'white',
            overflow: 'visible'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box sx={{ width: 4, height: 24, bgcolor: '#1976d2', borderRadius: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Notas a serem salvas <Chip label={notas.length} size="small" sx={{ ml: 1, fontWeight: 700, bgcolor: '#f1f5f9' }} />
                  </Typography>
                </Box>
                
                {notas.length > 0 && (
                  <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <Tooltip title="Total de volumes somados">
                      <Chip 
                        icon={<InventoryIcon sx={{ fontSize: '18px !important' }} />}
                        label={`Total de Volumes: ${totalVolumes}`}
                        sx={{ 
                          bgcolor: 'rgba(25, 118, 210, 0.08)', 
                          color: '#1976d2', 
                          fontWeight: 700,
                          px: 1
                        }}
                      />
                    </Tooltip>
                    
                    <Button 
                      color="error" 
                      size="small" 
                      variant="text"
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
                      sx={{ fontWeight: 600 }}
                    >
                      Limpar Tudo
                    </Button>
                    
                    <Box sx={{ position: 'relative' }}>
                      <Button
                        variant="contained"
                        onClick={handleSalvarTodasNotas}
                        disabled={loading || isSaving || notas.length === 0}
                        startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        sx={{
                          borderRadius: 2,
                          px: 3,
                          py: 1,
                          fontWeight: 700,
                          boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                          bgcolor: '#1976d2',
                          '&:hover': {
                            bgcolor: '#1565c0',
                            boxShadow: '0 6px 16px rgba(25, 118, 210, 0.3)',
                          }
                        }}
                      >
                        {isSaving ? 'Salvando...' : `Salvar ${notas.length} Nota${notas.length !== 1 ? 's' : ''}`}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
              
              <Divider sx={{ mb: 4, opacity: 0.6 }} />
              
              {notas.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <ReceiptIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2, opacity: 0.5 }} />
                  <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                    Nenhuma nota adicionada ainda.
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                    Use o scanner ou digite o código para começar.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <AnimatePresence>
                    {notas.map((nota, index) => (
                      <MotionBox
                        key={nota.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          variant="outlined"
                          sx={{
                            borderRadius: 3,
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              borderColor: '#1976d2',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                              bgcolor: 'rgba(25, 118, 210, 0.01)'
                            },
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Grid container alignItems="center" spacing={2}>
                              <Grid item xs={12} sm={6} md={4}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                  <Avatar sx={{ bgcolor: 'rgba(25, 118, 210, 0.1)', color: '#1976d2', width: 40, height: 40 }}>
                                    <ReceiptIcon fontSize="small" />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                                      NFE {nota.numeroNota}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                                      {nota.codigo.length > 20 ? `${nota.codigo.substring(0, 20)}...` : nota.codigo}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                {notaEditandoValor === nota.id ? (
                                  <Box display="flex" alignItems="center" gap={1}>
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
                                      sx={{ maxWidth: '100px' }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSalvarNota(index);
                                        if (e.key === 'Escape') setNotaEditandoValor(null);
                                      }}
                                    />
                                    <IconButton size="small" color="primary" onClick={() => handleSalvarNota(index)}>
                                      <CheckIcon />
                                    </IconButton>
                                    <IconButton size="small" onClick={() => setNotaEditandoValor(null)}>
                                      <CloseIcon />
                                    </IconButton>
                                  </Box>
                                ) : (
                                  <Tooltip title="Clique para editar volumes">
                                    <Box 
                                      onClick={() => setNotaEditandoValor(nota.id)}
                                      sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: 1, 
                                        cursor: 'pointer',
                                        bgcolor: '#f8fafc',
                                        px: 2,
                                        py: 0.8,
                                        borderRadius: 2,
                                        width: 'fit-content',
                                        '&:hover': { bgcolor: '#f1f5f9' }
                                      }}
                                    >
                                      <InventoryIcon sx={{ fontSize: 16, color: '#64748b' }} />
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                        {nota.volumes} {parseInt(nota.volumes) === 1 ? 'volume' : 'volumes'}
                                      </Typography>
                                      <EditIcon sx={{ fontSize: 14, color: '#94a3b8', ml: 0.5 }} />
                                    </Box>
                                  </Tooltip>
                                )}
                              </Grid>

                              <Grid item xs={12} sm={6} md={3}>
                                <Box display="flex" alignItems="center" gap={1}>
                                  <HistoryIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                                    {new Date(nota.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                  <Chip 
                                    label={nota.status} 
                                    size="small" 
                                    sx={{ 
                                      height: 20, 
                                      fontSize: '0.65rem', 
                                      fontWeight: 700,
                                      textTransform: 'uppercase',
                                      bgcolor: nota.status === 'concluido' ? '#dcfce7' : nota.status === 'erro' ? '#fee2e2' : '#f1f5f9',
                                      color: nota.status === 'concluido' ? '#166534' : nota.status === 'erro' ? '#991b1b' : '#475569'
                                    }} 
                                  />
                                </Box>
                              </Grid>

                              <Grid item xs={12} sm={6} md={2} sx={{ textAlign: 'right' }}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleRemoverNota(index)}
                                  disabled={isSaving}
                                  sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444', bgcolor: '#fef2f2' } }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </MotionBox>
                    ))}
                  </AnimatePresence>
                </Box>
              )}
            </CardContent>
          </Card>
        </MotionBox>
      </AnimatePresence>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header da Página */}
      <MotionBox 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        sx={{ mb: 4 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', mb: 1 }}>
          Adicionar Notas Fiscais
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748b' }}>
          Escaneie ou digite as notas para entrada no sistema.
        </Typography>
      </MotionBox>

      {/* Seção de Entrada */}
      <MotionBox 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        sx={{ mb: 4 }}
      >
        <Card sx={{ 
          borderRadius: 4, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
          border: '1px solid rgba(226, 232, 240, 0.8)',
          bgcolor: 'white'
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleAddManual}>
              <Grid container spacing={3} alignItems="flex-end">
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" sx={{ mb: 1.5, color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScannerIcon fontSize="small" />
                    Leitura de Código de Barras
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Aponte o scanner e leia o código..."
                    variant="outlined"
                    value={codigoBarras}
                    onChange={(e) => setCodigoBarras(e.target.value)}
                    onKeyDown={handleKeyDown}
                    inputRef={inputRef}
                    disabled={loading || isSaving}
                    autoFocus
                    InputProps={{
                      sx: { 
                        borderRadius: 3,
                        bgcolor: '#f8fafc',
                        '& fieldset': { borderColor: 'rgba(226, 232, 240, 0.8)' },
                        '&:hover fieldset': { borderColor: '#1976d2' },
                        height: 56,
                        fontSize: '1.1rem'
                      },
                      startAdornment: (
                        <InputAdornment position="start">
                          <ScannerIcon sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                      ),
                      endAdornment: codigoBarras && (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => {
                              setCodigoBarras('');
                              inputRef.current?.focus();
                            }}
                            edge="end"
                            size="small"
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button 
                    type="submit" 
                    fullWidth
                    variant="contained" 
                    disabled={!codigoBarras.trim() || loading || isSaving}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                    sx={{ 
                      height: 56, 
                      borderRadius: 3, 
                      fontWeight: 700,
                      fontSize: '1rem',
                      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)',
                      bgcolor: '#1976d2',
                      '&:hover': { bgcolor: '#1565c0' }
                    }}
                  >
                    {loading ? 'Processando...' : 'Adicionar Nota'}
                  </Button>
                </Grid>
              </Grid>
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon sx={{ fontSize: 16, color: '#94a3b8' }} />
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
                  Dica: Posicione o cursor no campo e use o scanner óptico para maior agilidade.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </MotionBox>

      {/* Lista de Notas */}
      {renderListaNotas()}
    </Container>
  );
};

export default AdicionarNotasContent;
