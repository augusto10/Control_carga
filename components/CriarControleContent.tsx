import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
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
  CircularProgress
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { Transportadora, NotaFiscal } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  }>({
    transportadoras: false,
    notas: false,
    submit: false
  });
  
  const [formData, setFormData] = useState({
    motorista: '',
    transportadoraId: 'ACERT', // Valor padrão para ACERT
    responsavel: '',
    observacoes: '',
    numeroManifesto: '',
    qtdPallets: 0,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedNotas, setSelectedNotas] = useState<string[]>([]);
  
  // Filtra as notas que não estão vinculadas a nenhum controle
  const notasDisponiveis = Array.isArray(notas) ? notas : [];
  const notasNaoVinculadas = notasDisponiveis.filter(nota => !nota.controleId);
  
  // Logs para depuração
  console.log('Todas as notas da store:', notas);
  console.log('Notas disponíveis (array):', notasDisponiveis);
  console.log('Notas não vinculadas:', notasNaoVinculadas);
  
  // Opções fixas de transportadoras
  const transportadorasFixas = [
    { id: 'ACERT', nome: 'ACERT', descricao: 'ACERT Transportes' },
    { id: 'EXPRESSO_GOIAS', nome: 'EXPRESSO_GOIAS', descricao: 'Expresso Goiás' },
  ];

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
    
    const newErrors: Record<string, string> = {};
    
    if (!formData.transportadoraId) {
      newErrors.transportadoraId = 'Transportadora é obrigatória';
    }
    
    if (!formData.motorista) {
      newErrors.motorista = 'Nome do motorista é obrigatório';
    }
    
    if (!formData.responsavel) {
      newErrors.responsavel = 'Nome do responsável é obrigatório';
    }
    
    if (!formData.numeroManifesto) {
      newErrors.numeroManifesto = 'Número do manifesto é obrigatório';
    }
    
    if (formData.qtdPallets <= 0) {
      newErrors.qtdPallets = 'Quantidade de pallets deve ser maior que zero';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      enqueueSnackbar('Corrija os erros no formulário', { variant: 'error' });
      return;
    }
    
    try {
      setIsLoading(prev => ({ ...prev, submit: true }));
      
      // Envia apenas os campos necessários para a API
      const dadosControle = {
        motorista: formData.motorista,
        cpfMotorista: 'PENDENTE',
        responsavel: formData.responsavel,
        transportadora: formData.transportadoraId as 'ACERT' | 'EXPRESSO_GOIAS',
        transportadoraId: formData.transportadoraId,
        qtdPallets: formData.qtdPallets,
        numeroManifesto: formData.numeroManifesto,
        observacao: formData.observacoes || undefined,
        notasIds: selectedNotas,
      };
      
      console.log('Dados do controle a serem enviados:', dadosControle);
      
      await criarControle(dadosControle);
      
      enqueueSnackbar('Controle criado com sucesso!', { variant: 'success' });
      router.push('/listar-controles');
    } catch (error) {
      console.error('Erro ao criar controle:', error);
      enqueueSnackbar(
        error instanceof Error ? error.message : 'Erro ao criar controle', 
        { variant: 'error' }
      );
    } finally {
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
              label="Número do Manifesto"
              name="numeroManifesto"
              value={formData.numeroManifesto}
              onChange={handleChange}
              error={!!errors.numeroManifesto}
              helperText={errors.numeroManifesto}
              margin="normal"
              required
            />
            
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
            
            <FormControl fullWidth sx={{ mb: 2 }} error={!!errors.transportadoraId}>
              <InputLabel id="transportadora-label">Transportadora *</InputLabel>
              <Select
                labelId="transportadora-label"
                id="transportadora"
                name="transportadoraId"
                value={formData.transportadoraId}
                onChange={handleChange}
                label="Transportadora *"
                required
              >
                {transportadorasFixas.map((transp) => (
                  <MenuItem key={transp.id} value={transp.id}>
                    {transp.descricao}
                  </MenuItem>
                ))}
              </Select>
              {errors.transportadoraId && (
                <FormHelperText>{errors.transportadoraId}</FormHelperText>
              )}
            </FormControl>
            
            <TextField
              fullWidth
              label="Motorista"
              name="motorista"
              value={formData.motorista}
              onChange={handleChange}
              error={!!errors.motorista}
              helperText={errors.motorista}
              margin="normal"
              required
            />
            
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
            
            <TextField
              fullWidth
              label="Observações"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              margin="normal"
              multiline
              rows={4}
            />
          </Box>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
            Notas Fiscais
          </Typography>
          
          <Box sx={{ mb: 4, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              Selecione as notas fiscais para vincular a este controle:
            </Typography>
            
            {isLoading.notas ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : notasDisponiveis.length === 0 ? (
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
                      primary={`Nota ${nota.numeroNota} - ${new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(nota.valor)}`}
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
          </Box>
          
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
