import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store/store';
import { CriarControleDTO } from '../types';
import { 
  Container,
  Typography,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Autocomplete,
  Grid,
  Card,
  CardContent,
  Divider,
  Chip,
  Tooltip,
  IconButton,
  InputAdornment,
  Avatar,
  LinearProgress,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { Transportadora as PrismaTransportadora } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LocalShipping as ShippingIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  Phone as PhoneIcon,
  DirectionsCar as CarIcon,
  Inventory as PalletIcon,
  Receipt as ReceiptIcon,
  Notes as NoteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { NumericFormat } from 'react-number-format';
import { isTransportadora } from '@/lib/notas/transportadora';
import {
  filtrarNotasDisponiveis,
  filtrarNotasSemTransportadora,
  limparSelecaoAoTrocarTransportadora,
} from '@/lib/controles/notas-direcionamento';

type TransportadoraEnum = (typeof PrismaTransportadora)[keyof typeof PrismaTransportadora];

const MotionBox = motion.create(Box);
const MotionGrid = motion.create(Grid);
const MotionCard = motion.create(Card);

interface Pessoa {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  cnh?: string | null;
  transportadoraId: string;
  tipo: 'MOTORISTA' | 'FUNCIONARIO' | 'CLIENTE';
  tipoLabel: string;
  displayName: string;
  transportadora?: {
    id: string;
    descricao: string;
  };
}

// Função para validar CPF
function validarCPF(cpf: string): boolean {
  cpf = cpf.replace(/[\D]/g, '');
  
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Validação do primeiro dígito
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  const digito1 = resto >= 10 ? 0 : resto;
  
  // Validação do segundo dígito
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  const digito2 = resto >= 10 ? 0 : resto;
  
  return parseInt(cpf.charAt(9)) === digito1 && parseInt(cpf.charAt(10)) === digito2;
}

function parseCurrencyBR(value: string): number {
  const cleaned = value
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : NaN;
}

const CriarControleContent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { 
    transportadoras, 
    fetchTransportadoras, 
    criarControle, 
    loading: storeLoading, 
    fetchNotasDisponiveis,
    transferirNotas,
    notas 
  } = useStore((state) => ({
    transportadoras: state.transportadoras,
    fetchTransportadoras: state.fetchTransportadoras,
    criarControle: state.criarControle,
    loading: state.loading,
    fetchNotasDisponiveis: state.fetchNotasDisponiveis,
    transferirNotas: state.transferirNotas,
    notas: state.notas
  }));
  
  const [isLoading, setIsLoading] = useState<{
    transportadoras: boolean;
    notas: boolean;
    submit: boolean;
    pessoas: boolean;
  }>({
    transportadoras: false,
    notas: false,
    submit: false,
    pessoas: false
  });
  
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  
  // Encontra a transportadora padrão (ACCERT)
  const transportadoraPadrao = transportadoras.find(t => t.id === 'ACCERT') || transportadoras[0];
  
  // Função para obter o objeto da transportadora pelo ID
  const getTransportadoraById = (id: string) => {
    const encontrada = transportadoras.find(t => t.id === id);
    if (!encontrada) {
      console.warn(`Transportadora com ID ${id} não encontrada, usando padrão`);
      return transportadoraPadrao;
    }
    return encontrada;
  };

  interface FormData {
    motorista: string;
    cpfMotorista: string;
    telefoneMotorista: string;
    transportadora: TransportadoraEnum;
    responsavel: string;
    observacao?: string;
    qtdPalletsLevados: number;
    qtdPalletsDevolvidos: number;
    placaVeiculo: string;
  }

  const [formData, setFormData] = useState<FormData>({
    motorista: 'PENDENTE',
    cpfMotorista: '',
    telefoneMotorista: '',
    transportadora: 'ACCERT' as TransportadoraEnum,
    responsavel: 'PENDENTE',
    observacao: '',
    qtdPalletsLevados: 0,
    qtdPalletsDevolvidos: 0,
    placaVeiculo: '',
  });
  const [freteDialogOpen, setFreteDialogOpen] = useState(false);
  const [freteInformado, setFreteInformado] = useState(false);
  const [valorFrete, setValorFrete] = useState('');
  
  useEffect(() => {
    if (user?.nome) {
      setFormData(prev => ({
        ...prev,
        responsavel: user.nome
      }));
    }
  }, [user]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedNotas, setSelectedNotas] = useState<string[]>([]);
  const [buscaNotas, setBuscaNotas] = useState('');
  const [mostrarSemTransportadora, setMostrarSemTransportadora] = useState(false);
  const [transportadoraTransferencia, setTransportadoraTransferencia] = useState<TransportadoraEnum>(
    PrismaTransportadora.ACCERT
  );
  const [isTransferring, setIsTransferring] = useState(false);
  
  const notasNaoVinculadas = mostrarSemTransportadora
    ? filtrarNotasSemTransportadora(Array.isArray(notas) ? notas : [])
    : filtrarNotasDisponiveis(
      Array.isArray(notas) ? notas : [],
      formData.transportadora
    );
  const notasFiltradas = notasNaoVinculadas.filter((nota) =>
    `${nota.numeroNota} ${nota.codigo}`.toLocaleLowerCase('pt-BR').includes(buscaNotas.trim().toLocaleLowerCase('pt-BR'))
  );

  const carregarNotasDisponiveis = useCallback(async (
    destino: TransportadoraEnum,
    semTransportadora = false
  ) => {
    setIsLoading((prev) => ({ ...prev, notas: true }));
    try {
      await fetchNotasDisponiveis(semTransportadora
        ? { semTransportadora: true }
        : { transportadoraDestino: destino });
    } catch (error) {
      console.error('Erro ao carregar notas disponíveis:', error);
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Erro ao carregar notas disponíveis',
        { variant: 'error' }
      );
    } finally {
      setIsLoading((prev) => ({ ...prev, notas: false }));
    }
  }, [fetchNotasDisponiveis, enqueueSnackbar]);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setIsLoading(prev => ({ ...prev, transportadoras: true, pessoas: true }));
        
        await fetchTransportadoras();
        
        // Carrega pessoas (motoristas, funcionários e clientes)
        const response = await api.get('/api/pessoas/para-controles');
        setPessoas(response.data.todas);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        enqueueSnackbar('Erro ao carregar os dados. Tente novamente.', { variant: 'error' });
      } finally {
        setIsLoading(prev => ({ ...prev, transportadoras: false, pessoas: false }));
      }
    };

    carregarDados();
  }, [fetchTransportadoras, enqueueSnackbar]);

  useEffect(() => {
    void carregarNotasDisponiveis(formData.transportadora, mostrarSemTransportadora);
  }, [carregarNotasDisponiveis, formData.transportadora, mostrarSemTransportadora]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<string>) => {
    const { name, value } = e.target as { name: string; value: string };
    
    // Tratamento especial para campos numéricos
    if (name === 'qtdPalletsLevados' || name === 'qtdPalletsDevolvidos') {
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    } else if (name === 'transportadora') {
      const transportadoraSelecionada = value as TransportadoraEnum;
      setSelectedNotas((selecionadas) => limparSelecaoAoTrocarTransportadora(
        selecionadas,
        formData.transportadora,
        transportadoraSelecionada
      ));
      setFormData(prev => ({
        ...prev,
        transportadora: transportadoraSelecionada
      }));

      if (transportadoraSelecionada === 'TERCEIRIZADA') {
        setFreteDialogOpen(true);
      } else {
        setFreteDialogOpen(false);
        setFreteInformado(false);
        setValorFrete('');
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Limpa o erro quando o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleTransferirNotas = async () => {
    const destino = mostrarSemTransportadora
      ? formData.transportadora
      : transportadoraTransferencia;
    if (
      selectedNotas.length === 0
      || (!mostrarSemTransportadora && destino === formData.transportadora)
    ) {
      return;
    }

    const destinoNome = getTransportadoraById(destino)?.descricao || destino;
    if (!window.confirm(
      `Transferir ${selectedNotas.length} nota(s) para ${destinoNome}? Elas sairão da fila atual.`
    )) {
      return;
    }

    setIsTransferring(true);
    try {
      const resultado = await transferirNotas(selectedNotas, destino);
      setSelectedNotas((selecionadas) => selecionadas.filter(
        (id) => !resultado.ids.includes(id)
      ));
      await carregarNotasDisponiveis(formData.transportadora, mostrarSemTransportadora);
      enqueueSnackbar(`${resultado.count} nota(s) transferida(s) para ${destinoNome}.`, {
        variant: 'success',
      });
    } catch (error) {
      console.error('Erro ao transferir notas:', error);
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Erro ao transferir notas',
        { variant: 'error' }
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mostrarSemTransportadora && selectedNotas.length > 0) {
      enqueueSnackbar('Direcione as notas para uma transportadora antes de vinculá-las ao controle.', {
        variant: 'warning',
      });
      return;
    }
    
    try {
      // Limpa erros anteriores
      setErrors({});
      
      // Validação dos campos
      const newErrors: Record<string, string> = {};
      
      if (!formData.transportadora) {
        newErrors.transportadora = 'Transportadora é obrigatória';
      }
      
      if (!formData.motorista?.trim()) {
        newErrors.motorista = 'Nome do motorista é obrigatório';
      }
      
      if (!formData.responsavel?.trim()) {
        newErrors.responsavel = 'Nome do responsável é obrigatório';
      }
      
      if (formData.qtdPalletsLevados < 0) {
        newErrors.qtdPalletsLevados = 'Pallets levados não pode ser negativo';
      }
      if (formData.qtdPalletsDevolvidos < 0) {
        newErrors.qtdPalletsDevolvidos = 'Pallets devolvidos não pode ser negativo';
      }
      if (!formData.placaVeiculo?.trim()) {
        newErrors.placaVeiculo = 'Placa do veículo é obrigatória';
      }

      if (formData.transportadora === 'TERCEIRIZADA' && freteInformado) {
        const valorNumericoFrete = parseCurrencyBR(valorFrete);
        if (!valorFrete || Number.isNaN(valorNumericoFrete) || valorNumericoFrete <= 0) {
          newErrors.valorFrete = 'Informe um valor de frete válido';
        }
      }
      
      // Se houver erros de validação, exibe e interrompe o processo
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        enqueueSnackbar('Corrija os erros no formulário', { 
          variant: 'error',
          autoHideDuration: 5000
        });
        return;
      }
      
      // Ativa o estado de carregamento
      setIsLoading(prev => ({ ...prev, submit: true }));
      
      // Garante que todos os campos obrigatórios tenham valores válidos
      const dadosControle = {
        motorista: (formData.motorista || 'PENDENTE').trim(),
        cpfMotorista: formData.cpfMotorista ? formData.cpfMotorista.replace(/[^\d]/g, '') : 'PENDENTE',
        responsavel: (formData.responsavel || 'PENDENTE').trim(),
        transportadora: (['ACERT', 'ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE', 'VLOG', 'ZANUELO_TRANSPORTE_LOGISTICA'].includes(formData.transportadora))
          ? formData.transportadora 
          : 'ACCERT',
        qtdPallets: Number(formData.qtdPalletsLevados) || 0, // Fallback to levados for total pallets
        qtdPalletsLevados: Number(formData.qtdPalletsLevados) || 0,
        qtdPalletsDevolvidos: Number(formData.qtdPalletsDevolvidos) || 0,
        placaVeiculo: (formData.placaVeiculo || '').trim(),
        observacao: formData.observacao?.trim() || undefined,
        freteInformado: formData.transportadora === 'TERCEIRIZADA' ? freteInformado : false,
        valorFrete: formData.transportadora === 'TERCEIRIZADA' && freteInformado
          ? parseCurrencyBR(valorFrete)
          : null,
        finalizado: false,
        notasIds: Array.isArray(selectedNotas) ? selectedNotas : []
      };
      
      console.log('Dados do controle formatados para envio:', JSON.stringify(dadosControle, null, 2));
      
      console.log('Dados do controle formatados para envio:', JSON.stringify(dadosControle, null, 2));
      
      console.log('Dados do controle antes do envio:', JSON.stringify(dadosControle, null, 2));
      
      console.log('[CriarControle] Dados do controle a serem enviados:', dadosControle);
      
      // Chama a função para criar o controle
      // Usa type assertion para garantir a compatibilidade de tipos
      const controleCriado = await criarControle(dadosControle as any);
      
      console.log('[CriarControle] Controle criado com sucesso:', controleCriado);
      
      // Exibe mensagem de sucesso e redireciona
      enqueueSnackbar('Controle criado com sucesso!', { 
        variant: 'success',
        autoHideDuration: 3000
      });
      
      // Redireciona para a lista de controles após um pequeno atraso
      setTimeout(() => {
        router.push('/controles');
      }, 1000);
      
    } catch (error) {
      console.error('[CriarControle] Erro ao criar controle:', error);
      
      let mensagemErro = 'Erro ao criar controle. Por favor, tente novamente.';
      
      if (error instanceof Error) {
        // Mensagens de erro mais amigáveis para o usuário
        if (error.message.includes('já existe')) {
          mensagemErro = 'Já existe um controle com esses dados. Verifique as informações e tente novamente.';
        } else if (error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
          mensagemErro = 'Sua sessão expirou. Por favor, faça login novamente.';
          // Redireciona para a página de login após mostrar a mensagem
          setTimeout(() => router.push('/login'), 1500);
        } else {
          mensagemErro = error.message || mensagemErro;
        }
      }
      
      enqueueSnackbar(mensagemErro, { 
        variant: 'error',
        autoHideDuration: 7000,
        persist: false
      });
      
    } finally {
      // Desativa o estado de carregamento independentemente do resultado
      setIsLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const responderFrete = (informarFrete: boolean) => {
    setFreteInformado(informarFrete);
    setFreteDialogOpen(false);

    if (!informarFrete) {
      setValorFrete('');
    }
  };

  if (isLoading.transportadoras || isLoading.notas) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <AnimatePresence>
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {storeLoading && (
            <LinearProgress 
              sx={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                right: 0, 
                zIndex: 2000,
                height: 3,
                bgcolor: alpha('#3b82f6', 0.1),
                '& .MuiLinearProgress-bar': {
                  bgcolor: '#3b82f6',
                  borderRadius: '0 4px 4px 0'
                }
              }} 
            />
          )}
          <MotionCard 
            elevation={0}
            sx={{ 
              borderRadius: '24px', 
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
              border: '1px solid',
              borderColor: alpha('#e2e8f0', 0.6),
              overflow: 'visible'
            }}
          >
            <CardContent sx={{ p: { xs: 3, md: 5 } }}>
              <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', gap: 2.5 }}>
                <Box sx={{ 
                  bgcolor: 'primary.main', 
                  p: 1.5, 
                  borderRadius: 3, 
                  boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShippingIcon sx={{ color: 'white', fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="800" color="#1e293b" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    Criar Novo Controle
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="500">
                    Inicie um novo processo de carregamento de carga
                  </Typography>
                </Box>
              </Box>

              <Box component="form" onSubmit={handleSubmit}>
                <Grid container spacing={4}>
                  {/* Seção: Dados do Responsável */}
                  <Grid item xs={12}>
                    <MotionBox
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Typography variant="h6" fontWeight="700" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <PersonIcon /> Responsável e Motorista
                      </Typography>
                      <Divider sx={{ mb: 3, opacity: 0.6 }} />
                    </MotionBox>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Responsável pelo Lançamento"
                      name="responsavel"
                      value={formData.responsavel}
                      onChange={handleChange}
                      error={!!errors.responsavel}
                      helperText={errors.responsavel}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="primary" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth error={!!errors.motorista}>
                      <Autocomplete
                        options={pessoas}
                        getOptionLabel={(option) => {
                          if (typeof option === 'string') return option;
                          return `${option.nome}`;
                        }}
                        value={pessoas.find(p => p.nome === formData.motorista) || null}
                        onChange={(_, newValue) => {
                          if (typeof newValue === 'string') {
                            setFormData(prev => ({
                              ...prev,
                              motorista: newValue,
                              cpfMotorista: '',
                              telefoneMotorista: ''
                            }));
                          } else if (newValue) {
                            const transportadoraSelecionada = newValue.transportadoraId as TransportadoraEnum;
                            setFormData(prev => ({
                              ...prev,
                              motorista: newValue.nome,
                              cpfMotorista: newValue.cpf,
                              telefoneMotorista: newValue.telefone || '',
                              transportadora: transportadoraSelecionada
                            }));

                            if (transportadoraSelecionada === 'TERCEIRIZADA') {
                              setFreteDialogOpen(true);
                            } else {
                              setFreteDialogOpen(false);
                              setFreteInformado(false);
                              setValorFrete('');
                            }
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              motorista: '',
                              cpfMotorista: '',
                              telefoneMotorista: ''
                            }));
                          }
                        }}
                        freeSolo
                        groupBy={(option) => {
                          if (option.tipo === 'MOTORISTA') return '🚛 Motoristas';
                          if (option.tipo === 'FUNCIONARIO') return '👨‍💼 Funcionários';
                          return '🏢 Clientes';
                        }}
                        renderOption={(props, option) => {
                          const transportadoraMap: Record<string, string> = {
                            'ACERT': 'ACERT Transportes',
                            'ACCERT': 'ACCERT Transportes',
                            'EXPRESSO_GOIAS': 'Expresso Goiás',
                            'TERCEIRIZADA': 'Terceirizada',
                            'DETAFRA_TRANSPORTES': 'Detafra Transportes',
                            'RETIRA_VENDEDOR': 'Retira Vendedor',
                            'RETIRA_CLIENTE': 'Retira Cliente',
                            'VLOG': 'VLOG Transportes',
                            'ZANUELO_TRANSPORTE_LOGISTICA': 'Zanuelo Transporte e Logistica'
                          };
                          
                          const transportadoraNome = transportadoraMap[option.transportadoraId] || option.transportadoraId;
                          const tipoColor = option.tipo === 'MOTORISTA' ? '#1976d2' : 
                                           option.tipo === 'FUNCIONARIO' ? '#ed6c02' : '#2e7d32';
                          
                          return (
                            <li {...props}>
                              <Box sx={{ width: '100%', py: 1.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                                  <Typography variant="body1" fontWeight="700" sx={{ color: tipoColor }}>
                                    {option.nome}
                                  </Typography>
                                  <Chip 
                                    label={option.tipoLabel} 
                                    size="small" 
                                    sx={{ 
                                      height: 20, 
                                      fontSize: '0.7rem', 
                                      bgcolor: tipoColor, 
                                      color: 'white',
                                      fontWeight: '800',
                                      borderRadius: 1
                                    }} 
                                  />
                                </Box>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                  <Typography variant="caption" color="text.secondary">
                                    <strong>CPF:</strong> {option.cpf}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    <strong>Tel:</strong> {option.telefone || 'N/A'}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.primary" sx={{ mt: 0.5, display: 'block' }}>
                                  Transportadora: <strong>{transportadoraNome}</strong>
                                </Typography>
                              </Box>
                            </li>
                          );
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Pessoa Responsável (Motorista/Cli/Func)"
                            name="motorista"
                            required
                            error={!!errors.motorista}
                            helperText={errors.motorista}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                            InputProps={{
                              ...params.InputProps,
                              startAdornment: (
                                <InputAdornment position="start">
                                  <ShippingIcon color="primary" fontSize="small" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        )}
                        loading={isLoading.pessoas}
                      />
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="CPF do Motorista"
                      name="cpfMotorista"
                      value={formData.cpfMotorista}
                      onChange={handleChange}
                      error={!!errors.cpfMotorista}
                      helperText={errors.cpfMotorista || "Apenas números"}
                      required
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BadgeIcon color="primary" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Telefone"
                      name="telefoneMotorista"
                      value={formData.telefoneMotorista}
                      onChange={handleChange}
                      placeholder="(00) 00000-0000"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon color="primary" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth error={!!errors.transportadora} required>
                      <InputLabel>Transportadora</InputLabel>
                      <Select
                        name="transportadora"
                        value={formData.transportadora}
                        onChange={handleChange}
                        label="Transportadora"
                        sx={{ borderRadius: 3 }}
                        startAdornment={
                          <InputAdornment position="start" sx={{ ml: 1, mr: -0.5 }}>
                            <ShippingIcon color="primary" fontSize="small" />
                          </InputAdornment>
                        }
                      >
                        {transportadoras.length === 0 ? (
                          <MenuItem value={formData.transportadora}>Carregando...</MenuItem>
                        ) : (
                          transportadoras.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.descricao}
                            </MenuItem>
                          ))
                        )}
                        {!transportadoras.some(t => t.id === formData.transportadora) && transportadoras.length > 0 && (
                          <MenuItem value={formData.transportadora}>{formData.transportadora}</MenuItem>
                        )}
                      </Select>
                      {errors.transportadora && <FormHelperText>{errors.transportadora}</FormHelperText>}
                    </FormControl>
                  </Grid>

                  {formData.transportadora === 'TERCEIRIZADA' && (
                    <Grid item xs={12}>
                      <Alert
                        severity={freteInformado ? 'success' : 'info'}
                        action={
                          <Button color="inherit" size="small" onClick={() => setFreteDialogOpen(true)}>
                            {freteInformado ? 'Alterar frete' : 'Informar frete'}
                          </Button>
                        }
                      >
                        {freteInformado
                          ? 'Frete informado e será salvo junto com este controle.'
                          : 'Este controle está marcado como terceirizado. Você pode informar o valor do frete agora.'}
                      </Alert>
                    </Grid>
                  )}

                  {formData.transportadora === 'TERCEIRIZADA' && freteInformado && (
                    <Grid item xs={12} md={4}>
                      <NumericFormat
                        value={valorFrete}
                        onValueChange={(values) => {
                          setValorFrete(values.formattedValue);
                          if (errors.valorFrete) {
                            setErrors(prev => ({ ...prev, valorFrete: '' }));
                          }
                        }}
                        customInput={TextField}
                        fullWidth
                        label="Valor do Frete"
                        name="valorFrete"
                        allowNegative={false}
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={2}
                        fixedDecimalScale
                        prefix=""
                        required
                        error={!!errors.valorFrete}
                        helperText={errors.valorFrete || 'Ex.: R$ 150,00'}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Box component="span" sx={{ fontWeight: 700, color: 'primary.main', minWidth: 26 }}>
                                R$
                              </Box>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                  )}

                  {/* Seção: Dados do Veículo e Carga */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <MotionBox
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Typography variant="subtitle1" fontWeight="700" color="#1e293b" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box sx={{ display: 'flex', p: 0.5, bgcolor: alpha('#3b82f6', 0.1), borderRadius: 1, color: 'primary.main' }}>
                          <CarIcon fontSize="small" />
                        </Box>
                        Veículo e Carga
                      </Typography>
                      <Divider sx={{ mb: 3, opacity: 0.6 }} />
                    </MotionBox>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Placa do Veículo"
                      name="placaVeiculo"
                      value={formData.placaVeiculo}
                      onChange={handleChange}
                      error={!!errors.placaVeiculo}
                      helperText={errors.placaVeiculo}
                      required
                      placeholder="ABC1D23"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CarIcon color="primary" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Pallets Levados"
                      name="qtdPalletsLevados"
                      type="number"
                      value={formData.qtdPalletsLevados}
                      onChange={handleChange}
                      error={!!errors.qtdPalletsLevados}
                      helperText={errors.qtdPalletsLevados}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PalletIcon color="primary" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Pallets Devolvidos"
                      name="qtdPalletsDevolvidos"
                      type="number"
                      value={formData.qtdPalletsDevolvidos}
                      onChange={handleChange}
                      error={!!errors.qtdPalletsDevolvidos}
                      helperText={errors.qtdPalletsDevolvidos}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PalletIcon color="primary" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* Seção: Notas Fiscais */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <MotionBox
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Typography variant="h6" fontWeight="700" color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <ReceiptIcon /> Vincular Notas Fiscais
                      </Typography>
                      <Divider sx={{ mb: 2, opacity: 0.6 }} />
                    </MotionBox>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl size="small" sx={{ mb: 2, minWidth: 280 }}>
                      <InputLabel id="fila-notas-label">Fila de notas</InputLabel>
                      <Select
                        labelId="fila-notas-label"
                        value={mostrarSemTransportadora ? 'semTransportadora' : 'destino'}
                        label="Fila de notas"
                        onChange={(event) => {
                          const semTransportadora = event.target.value === 'semTransportadora';
                          setSelectedNotas([]);
                          setMostrarSemTransportadora(semTransportadora);
                        }}
                      >
                        <MenuItem value="destino">
                          Destinadas a {getTransportadoraById(formData.transportadora)?.descricao || formData.transportadora}
                        </MenuItem>
                        <MenuItem value="semTransportadora">Sem transportadora</MenuItem>
                      </Select>
                    </FormControl>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {notasNaoVinculadas.length} {mostrarSemTransportadora
                          ? 'notas sem transportadora'
                          : 'notas disponíveis'} • {selectedNotas.length} selecionadas
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {selectedNotas.length > 0 && (
                          mostrarSemTransportadora ? (
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={handleTransferirNotas}
                              disabled={isTransferring || storeLoading}
                              startIcon={isTransferring ? <CircularProgress size={16} /> : undefined}
                              sx={{ textTransform: 'none' }}
                            >
                              Direcionar para {getTransportadoraById(formData.transportadora)?.descricao || formData.transportadora}
                            </Button>
                          ) : (
                            <>
                              <FormControl size="small" sx={{ minWidth: 220 }}>
                                <InputLabel id="transportadora-transferencia-label">
                                  Transferir para
                                </InputLabel>
                                <Select
                                  labelId="transportadora-transferencia-label"
                                  value={transportadoraTransferencia}
                                  label="Transferir para"
                                  onChange={(event) => {
                                    const destino = event.target.value;
                                    if (isTransportadora(destino)) {
                                      setTransportadoraTransferencia(destino);
                                    }
                                  }}
                                  disabled={isTransferring}
                                >
                                  {transportadoras.map((transportadora) => (
                                    <MenuItem
                                      key={transportadora.id}
                                      value={transportadora.id}
                                      disabled={transportadora.id === formData.transportadora}
                                    >
                                      {transportadora.descricao}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={handleTransferirNotas}
                                disabled={
                                  isTransferring
                                  || storeLoading
                                  || transportadoraTransferencia === formData.transportadora
                                }
                                startIcon={isTransferring ? <CircularProgress size={16} /> : undefined}
                                sx={{ textTransform: 'none' }}
                              >
                                Transferir selecionadas
                              </Button>
                            </>
                          )
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={notasNaoVinculadas.length === 0 || isTransferring}
                          onClick={() => {
                            if (selectedNotas.length === notasNaoVinculadas.length) {
                              // Se todas já estão selecionadas, limpa a seleção
                              setSelectedNotas([]);
                            } else {
                              // Seleciona todas as notas disponíveis
                              setSelectedNotas(notasNaoVinculadas.map(n => n.id));
                            }
                          }}
                          sx={{ 
                            borderRadius: 2,
                            textTransform: 'none',
                            fontWeight: 500,
                            fontSize: '0.75rem'
                          }}
                        >
                          {selectedNotas.length === notasNaoVinculadas.length ? 'Limpar Seleção' : 'Selecionar Todas'}
                        </Button>
                        {selectedNotas.length > 0 && (
                          <Button
                            variant="outlined"
                            size="small"
                            color="error"
                            onClick={() => setSelectedNotas([])}
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'none',
                              fontWeight: 500,
                              fontSize: '0.75rem'
                            }}
                          >
                            Desmarcar Todas
                          </Button>
                        )}
                      </Box>
                    </Box>
                    
                    {notasNaoVinculadas.length === 0 ? (
                      <Alert severity="info">
                        {mostrarSemTransportadora
                          ? 'Não há notas sem transportadora.'
                          : `Não há notas disponíveis para ${getTransportadoraById(formData.transportadora)?.descricao || formData.transportadora}.`}
                      </Alert>
                    ) : (
                    <FormControl fullWidth>
                      <TextField
                        label="Pesquisar notas fiscais"
                        placeholder="Número da nota ou código"
                        value={buscaNotas}
                        onChange={(event) => setBuscaNotas(event.target.value)}
                        sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      />
                      <List aria-label="Notas fiscais disponíveis" sx={{ maxHeight: 420, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        {notasFiltradas.map((nota) => {
                          const checked = selectedNotas.includes(nota.id);
                          return (
                            <ListItem key={nota.id} disablePadding divider>
                              <ListItemButton
                                role="checkbox"
                                aria-checked={checked}
                                aria-label={`Selecionar nota fiscal ${nota.numeroNota}`}
                                selected={checked}
                                disabled={isTransferring || isLoading.notas}
                                onClick={() => setSelectedNotas((atual) => checked
                                  ? atual.filter((id) => id !== nota.id)
                                  : [...atual, nota.id])}
                              >
                                <Checkbox checked={checked} tabIndex={-1} disableRipple sx={{ pointerEvents: 'none' }} inputProps={{ 'aria-hidden': true }} />
                                <ListItemText primary={`NF: ${nota.numeroNota}`} secondary={`Código: ${nota.codigo} • Volumes: ${nota.volumes || '0'}`} />
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                        {notasFiltradas.length === 0 && (
                          <ListItem><ListItemText primary="Nenhuma nota encontrada para esta pesquisa." /></ListItem>
                        )}
                      </List>
                      <FormHelperText>
                        {mostrarSemTransportadora
                          ? 'Direcione as notas para uma transportadora antes de vinculá-las.'
                          : `${selectedNotas.length} notas selecionadas para esta transportadora.`}
                      </FormHelperText>
                    </FormControl>
                    )}
                  </Grid>

                  {/* Seção: Observações */}
                  <Grid item xs={12} sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="Observações Adicionais"
                      name="observacao"
                      multiline
                      rows={3}
                      value={formData.observacao}
                      onChange={handleChange}
                      placeholder="Alguma informação extra sobre este carregamento..."
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1.5 }}>
                            <NoteIcon color="primary" fontSize="small" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* Botões de Ação */}
                  <Grid item xs={12} sx={{ mt: 4 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'flex-end' }}>
                      <Button
                        variant="outlined"
                        onClick={() => router.back()}
                        startIcon={<BackIcon />}
                        sx={{ 
                          borderRadius: 3, 
                          px: 4, 
                          py: 1.5,
                          textTransform: 'none',
                          fontWeight: '700',
                          borderWidth: '2px',
                          '&:hover': { borderWidth: '2px' }
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isLoading.submit}
                        startIcon={isLoading.submit ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        sx={{ 
                          borderRadius: 3, 
                          px: 6, 
                          py: 1.5,
                          textTransform: 'none',
                          fontWeight: '700',
                          boxShadow: '0 8px 16px rgba(25, 118, 210, 0.25)',
                          '&:hover': {
                            boxShadow: '0 12px 20px rgba(25, 118, 210, 0.35)',
                            transform: 'translateY(-2px)'
                          },
                          transition: 'all 0.3s'
                        }}
                      >
                        {isLoading.submit ? 'Criando...' : 'Criar Controle'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </MotionCard>
        </MotionBox>
      </AnimatePresence>

      <Dialog open={freteDialogOpen} onClose={() => setFreteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Informar frete</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            A transportadora foi marcada como terceirizada. Deseja informar o valor do frete agora?
          </DialogContentText>
          <DialogContentText variant="body2" color="text.secondary">
            Se você escolher não informar agora, o controle será salvo sem valor de frete.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => responderFrete(false)} variant="outlined">
            Salvar sem frete
          </Button>
          <Button onClick={() => responderFrete(true)} variant="contained">
            Informar frete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CriarControleContent;
