import React, { useState, useEffect } from 'react';
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
  SelectChangeEvent,
  MenuItem,
  FormHelperText,
  Paper,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { Transportadora, NotaFiscal } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import { api } from '@/services/api';

interface Motorista {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  cnh: string;
  transportadoraId: string;
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

const CriarControleContent: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { 
    transportadoras, 
    fetchTransportadoras, 
    criarControle, 
    loading: storeLoading, 
    fetchNotas, 
    notas 
  } = useStore((state) => ({
    transportadoras: state.transportadoras,
    fetchTransportadoras: state.fetchTransportadoras,
    criarControle: state.criarControle,
    loading: state.loading,
    fetchNotas: state.fetchNotas,
    notas: state.notas
  }));
  
  const [isLoading, setIsLoading] = useState<{
    transportadoras: boolean;
    notas: boolean;
    submit: boolean;
    motoristas: boolean;
  }>({
    transportadoras: false,
    notas: false,
    submit: false,
    motoristas: false
  });
  
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  
  // Opções fixas de transportadoras
  // Usamos 'ACERT' como ID para compatibilidade com o backend, mas exibimos 'ACCERT' na interface
  const transportadorasFixas = [
    { id: 'ACERT', nome: 'ACCERT', descricao: 'ACCERT' },
    { id: 'EXPRESSO_GOIAS', nome: 'EXPRESSO_GOIAS', descricao: 'EXPRESSO GOIÁS' }
  ];

  // Encontra a transportadora padrão (ACERT)
  const transportadoraPadrao = transportadorasFixas.find(t => t.id === 'ACERT');
  
  // Função para obter o objeto da transportadora pelo ID
  const getTransportadoraById = (id: string) => {
    const encontrada = transportadorasFixas.find(t => t.id === id);
    if (!encontrada) {
      console.warn(`Transportadora com ID ${id} não encontrada, usando padrão`);
      return transportadoraPadrao;
    }
    return encontrada;
  };

  type Transportadora = 'ACERT' | 'EXPRESSO_GOIAS';
  
  interface FormData {
    motorista: string;
    cpfMotorista: string;
    telefoneMotorista: string;
    transportadora: Transportadora;
    responsavel: string;
    observacao?: string; // Torna opcional para ser compatível com string | undefined
    qtdPallets: number;
  }

  const [formData, setFormData] = useState<FormData>({
    motorista: 'PENDENTE',
    cpfMotorista: '',
    telefoneMotorista: '',
    transportadora: 'ACERT',
    responsavel: 'PENDENTE',
    observacao: '',
    qtdPallets: 1,
  });
  
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
  
  // Filtra as notas que não estão vinculadas a nenhum controle
  const notasDisponiveis = Array.isArray(notas) ? notas : [];
  const notasNaoVinculadas = notasDisponiveis.filter(nota => !nota.controleId);
  
  // Logs para depuração
  console.log('Todas as notas da store:', notas);
  console.log('Notas disponíveis (array):', notasDisponiveis);
  console.log('Notas não vinculadas:', notasNaoVinculadas);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setIsLoading(prev => ({ ...prev, transportadoras: true, notas: true, motoristas: true }));
        
        // Carrega transportadoras e notas em paralelo
        await Promise.all([
          fetchTransportadoras(),
          fetchNotas()
        ]);
        
        // Carrega motoristas
        const response = await api.get<Motorista[]>('/api/motoristas');
        setMotoristas(response.data);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        enqueueSnackbar('Erro ao carregar os dados. Tente novamente.', { variant: 'error' });
      } finally {
        setIsLoading(prev => ({ ...prev, transportadoras: false, notas: false, motoristas: false }));
      }
    };

    carregarDados();
  }, [fetchTransportadoras, fetchNotas, enqueueSnackbar]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | SelectChangeEvent<string>) => {
    const { name, value } = e.target as { name: string; value: string };
    
    // Tratamento especial para campos numéricos
    if (name === 'qtdPallets') {
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      if (formData.qtdPallets <= 0) {
        newErrors.qtdPallets = 'Quantidade de pallets deve ser maior que zero';
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
        transportadora: (formData.transportadora === 'ACERT' || formData.transportadora === 'EXPRESSO_GOIAS') 
          ? formData.transportadora 
          : 'ACERT',
        qtdPallets: Number(formData.qtdPallets) || 0,
        observacao: formData.observacao?.trim() || undefined,
        finalizado: false, // Adiciona o campo finalizado
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
        router.push('/listar-controles');
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
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Criar Novo Controle de Carga
        </Typography>
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
            Dados do Motorista
          </Typography>
          
          <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))" gap={2}>
            <TextField
              fullWidth
              label="Responsável"
              name="responsavel"
              value={formData.responsavel}
              onChange={handleChange}
              error={!!errors.responsavel}
              helperText={errors.responsavel}
              margin="normal"
              required
            />
                        <FormControl fullWidth margin="normal" error={!!errors.motorista}>
              <Autocomplete
                options={motoristas}
                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.nome} (${option.cpf})`}
                value={motoristas.find(m => m.nome === formData.motorista) || null}
                onChange={(_, newValue) => {
                  if (typeof newValue === 'string') {
                    setFormData(prev => ({
                      ...prev,
                      motorista: newValue,
                      cpfMotorista: '',
                      telefoneMotorista: ''
                    }));
                  } else if (newValue) {
                    // Atualiza todos os campos do motorista, incluindo a transportadora
                    const transportadoraSelecionada = getTransportadoraById(newValue.transportadoraId);
                    setFormData(prev => ({
                      ...prev,
                      motorista: newValue.nome,
                      cpfMotorista: newValue.cpf,
                      telefoneMotorista: newValue.telefone || '',
                      transportadora: (transportadoraSelecionada?.id === 'ACERT' || transportadoraSelecionada?.id === 'EXPRESSO_GOIAS' 
                        ? transportadoraSelecionada.id 
                        : 'ACERT') as Transportadora
                    }));
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
                renderOption={(props, option) => (
                  <li {...props}>
                    <div>
                      <div><strong>{option.nome}</strong></div>
                      <div>CPF: {option.cpf}</div>
                      <div>Telefone: {option.telefone || 'Não informado'}</div>
                      <div>Transportadora: {option.transportadora?.descricao || 'Não informada'}</div>
                    </div>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Motorista"
                    name="motorista"
                    required
                    error={!!errors.motorista}
                    helperText={errors.motorista}
                  />
                )}
                loading={isLoading.motoristas}
              />
            </FormControl>
            
            <TextField
              fullWidth
              label="CPF do Motorista"
              name="cpfMotorista"
              value={formData.cpfMotorista}
              onChange={handleChange}
              error={!!errors.cpfMotorista}
              helperText={errors.cpfMotorista || "Apenas números"}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Telefone do Motorista"
              name="telefoneMotorista"
              value={formData.telefoneMotorista}
              onChange={handleChange}
              margin="normal"
              placeholder="(00) 00000-0000"
              inputProps={{
                maxLength: 15
              }}
            />
            <FormControl fullWidth error={!!errors.transportadora} margin="normal">
              <InputLabel id="transportadora-label">Transportadora</InputLabel>
              <Select
                labelId="transportadora-label"
                id="transportadora"
                name="transportadora"
                value={formData.transportadora}
                onChange={handleChange}
                label="Transportadora"
              >
                {transportadorasFixas.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.descricao}
                  </MenuItem>
                ))}
              </Select>
              {errors.transportadora && (
                <FormHelperText>{errors.transportadora}</FormHelperText>
              )}
            </FormControl>
            
            <TextField
              fullWidth
              label="Quantidade de Pallets"
              name="qtdPallets"
              type="number"
              value={formData.qtdPallets}
              onChange={(e) => setFormData({...formData, qtdPallets: parseInt(e.target.value) || 0})}
              error={!!errors.qtdPallets}
              helperText={errors.qtdPallets}
              margin="normal"
              inputProps={{ min: 1 }}
              required
            />
            
            <TextField
              fullWidth
              label="Observações"
              name="observacao"
              value={formData.observacao}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={4}
            />
          </Box>
          <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
            Notas Fiscais
          </Typography>
          {notasDisponiveis.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
              Nenhuma nota fiscal disponível para vincular.
            </Typography>
          ) : (
            <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
              {notasNaoVinculadas.map((nota) => (
                <ListItem 
                  key={nota.id}
                  button 
                  onClick={() => {
                    setSelectedNotas(prev => 
                      prev.includes(nota.id)
                        ? prev.filter(id => id !== nota.id)
                        : [...prev, nota.id]
                    );
                  }}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' },
                    backgroundColor: selectedNotas.includes(nota.id) ? 'action.selected' : 'transparent',
                    borderRadius: 1,
                    mb: 0.5
                  }}
                >
                  <Checkbox
                    edge="start"
                    checked={selectedNotas.includes(nota.id)}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ 'aria-labelledby': `nota-${nota.id}` }}
                  />
                  <ListItemText 
                    id={`nota-${nota.id}`}
                    primary={`Nota ${nota.numeroNota} - ${nota.volumes} volume${parseInt(nota.volumes) !== 1 ? 's' : ''}`}
                    secondary={`Código: ${nota.codigo} • Data: ${format(new Date(nota.dataCriacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
            
          {selectedNotas.length > 0 && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              {selectedNotas.length} nota(s) selecionada(s)
            </Typography>
          )}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => router.push('/')}
              disabled={isLoading.transportadoras || isLoading.notas}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading.submit}
              startIcon={isLoading.submit ? <CircularProgress size={20} /> : null}
            >
              {isLoading.submit ? 'Salvando...' : 'Criar Controle'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default CriarControleContent;
