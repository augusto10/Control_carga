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
import { Transportadora, NotaFiscal, Motorista } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
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

  // Estado para motoristas
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);

  // Carrega motoristas ao montar o componente
  useEffect(() => {
    const carregarMotoristas = async () => {
      try {
        setIsLoading(prev => ({ ...prev, motoristas: true }));
        const res = await fetch('/api/motoristas', { credentials: 'include' });
        if (res.ok) {
          const data: Motorista[] = await res.json();
          setMotoristas(data);
        }
      } catch (err) {
        console.error('Erro ao carregar motoristas:', err);
      } finally {
        setIsLoading(prev => ({ ...prev, motoristas: false }));
      }
    };

    carregarMotoristas();
  }, []);

  // Opções fixas de transportadoras
  const transportadorasFixas = [
    { id: 'ACCERT', nome: 'ACCERT', descricao: 'ACCERT' },
    { id: 'EXPRESSO_GOIAS', nome: 'EXPRESSO_GOIAS', descricao: 'EXPRESSO GOIÁS' }
  ];

  // Encontra a transportadora padrão (ACERT)
  const transportadoraPadrao = transportadorasFixas.find(t => t.id === 'ACERT');

  const [formData, setFormData] = useState({
    motorista: null as Motorista | null,
    cpfMotorista: '',
    transportadora: transportadoraPadrao?.id || 'ACCERT',
    responsavel: 'PENDENTE',
    observacao: '',
    qtdPallets: 0,
  });
  
  useEffect(() => {
    if (session?.user?.nome) {
      setFormData(prev => ({
        ...prev,
        responsavel: session.user.nome
      }));
    }
  }, [session?.user]);

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
        setIsLoading(prev => ({ ...prev, transportadoras: true, notas: true }));
        
        // Buscar notas da API
        await fetchNotas();
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        enqueueSnackbar('Erro ao carregar notas fiscais', { variant: 'error' });
      } finally {
        setIsLoading(prev => ({ ...prev, transportadoras: false, notas: false }));
      }
    };
    
    carregarDados();
  }, [fetchNotas, enqueueSnackbar]);

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
      
      if (!formData.motorista) {
        newErrors.motorista = 'Motorista é obrigatório';
      }
      
      if (!formData.responsavel?.trim()) {
        newErrors.responsavel = 'Nome do responsável é obrigatório';
      }

      if (!formData.cpfMotorista?.trim()) {
        newErrors.cpfMotorista = 'CPF do motorista é obrigatório';
      } else if (!validarCPF(formData.cpfMotorista)) {
        newErrors.cpfMotorista = 'CPF inválido';
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
      const dadosControle: CriarControleDTO = {
        motorista: formData.motorista?.nome || 'PENDENTE',
        cpfMotorista: formData.motorista?.cpf || '',
        responsavel: (formData.responsavel || 'PENDENTE').trim(),
        transportadora: formData.transportadora as 'ACCERT' | 'EXPRESSO_GOIAS',
        qtdPallets: Number(formData.qtdPallets) || 0,
        observacao: formData.observacao?.trim(),
        notasIds: Array.isArray(selectedNotas) ? selectedNotas : []
      };
      
      console.log('Dados do controle formatados para envio:', JSON.stringify(dadosControle, null, 2));
      
      // Chama a função para criar o controle
      const controleCriado = await criarControle(dadosControle);
      
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
      setIsLoading(prev => ({ ...prev, submit: false }));
    }
  };

  if (isLoading.transportadoras || isLoading.notas || isLoading.motoristas) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h5" gutterBottom>
        Criar Controle de Carga
      </Typography>

      <form onSubmit={handleSubmit}>
        <FormControl fullWidth margin="normal">
          <Autocomplete
            options={motoristas}
            getOptionLabel={(option) => option.nome}
            value={formData.motorista || null}
            onChange={(event, newValue) => {
              setFormData(prev => ({
                ...prev,
                motorista: newValue || null,
                cpfMotorista: newValue?.cpf || ''
              }));
              if (errors.motorista) {
                setErrors(prev => ({
                  ...prev,
                  motorista: ''
                }));
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Motorista"
                error={!!errors.motorista}
                helperText={errors.motorista}
                disabled={isLoading.submit || isLoading.motoristas}
                margin="normal"
                required
              />
            )}
            disabled={isLoading.submit || isLoading.motoristas}
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="CPF do Motorista"
            name="cpfMotorista"
            value={formData.cpfMotorista}
            onChange={handleChange}
            disabled={isLoading.submit || formData.motorista}
            error={!!errors.cpfMotorista}
            helperText={errors.cpfMotorista}
            margin="normal"
            required
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <InputLabel>Transportadora</InputLabel>
          <Select
            name="transportadora"
            value={formData.transportadora}
            onChange={handleChange}
            disabled={isLoading.submit}
          >
            <MenuItem value="ACCERT">ACCERT</MenuItem>
            <MenuItem value="EXPRESSO_GOIAS">EXPRESSO GOIÁS</MenuItem>
          </Select>
          {errors.transportadora && <FormHelperText error>{errors.transportadora}</FormHelperText>}
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="Responsável"
            name="responsavel"
            value={formData.responsavel}
            onChange={handleChange}
            disabled={isLoading.submit}
            error={!!errors.responsavel}
            helperText={errors.responsavel}
            margin="normal"
            required
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="Quantidade de Pallets"
            name="qtdPallets"
            type="number"
            value={formData.qtdPallets}
            onChange={handleChange}
            disabled={isLoading.submit}
            error={!!errors.qtdPallets}
            helperText={errors.qtdPallets}
            margin="normal"
            required
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <TextField
            label="Observações"
            name="observacao"
            value={formData.observacao}
            onChange={handleChange}
            multiline
            rows={3}
            disabled={isLoading.submit}
            margin="normal"
          />
        </FormControl>

        <FormControl fullWidth margin="normal">
          <Typography variant="subtitle1" gutterBottom>
            Selecione as notas fiscais
          </Typography>
          <List>
            {notasNaoVinculadas.map((nota) => (
              <ListItem
                key={nota.id}
                secondaryAction={
                  <Checkbox
                    edge="end"
                    checked={selectedNotas.includes(nota.id)}
                    onChange={(event) => {
                      const newValue = event.target.checked
                        ? [...selectedNotas, nota.id]
                        : selectedNotas.filter(id => id !== nota.id);
                      setSelectedNotas(newValue);
                    }}
                  />
                }
              >
                <ListItemText
                  primary={`${nota.numeroNota} - ${format(nota.dataCriacao, 'dd/MM/yyyy', { locale: ptBR })}`}
                  secondary={nota.codigo}
                />
              </ListItem>
            ))}
          </List>
        </FormControl>

        {selectedNotas.length > 0 && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontStyle: 'italic' }}>
            {selectedNotas.length} nota(s) selecionada(s)
          </Typography>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/')}
            disabled={isLoading.transportadoras || isLoading.notas || isLoading.motoristas}
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
      </form>
    </Container>
  );
};

export default CriarControleContent;
