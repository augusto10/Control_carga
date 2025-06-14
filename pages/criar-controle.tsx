import React, { useState } from 'react';
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
  MenuItem,
  FormHelperText
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { Transportadora } from '@prisma/client';

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

const CriarControlePage = () => {
  const { criarControle } = useStore();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  
  const [formData, setFormData] = useState<{
    motorista: string;
    cpfMotorista: string;
    responsavel: string;
    transportadora: Transportadora;
    qtdPallets: number;
    observacao: string;
    numeroManifesto?: string; // Será preenchido no submit
  }>({
    motorista: '',
    cpfMotorista: '',
    responsavel: '',
    transportadora: Transportadora.ACERT,
    qtdPallets: 1,
    observacao: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name?: string; value: unknown } } | { target: { name?: string; value: Transportadora } }) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
    
    // Limpa o erro do campo ao modificar
    if (errors[name as string]) {
      setErrors(prev => ({
        ...prev,
        [name as string]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validação do motorista
    if (!formData.motorista.trim()) {
      newErrors.motorista = 'Nome do motorista é obrigatório';
    }
    
    // Validação do CPF
    if (!formData.cpfMotorista.trim()) {
      newErrors.cpfMotorista = 'CPF do motorista é obrigatório';
    } else if (!/^\d{11}$/.test(formData.cpfMotorista)) {
      newErrors.cpfMotorista = 'CPF deve conter 11 dígitos numéricos';
    } else if (!validarCPF(formData.cpfMotorista)) {
      newErrors.cpfMotorista = 'CPF inválido';
    }
    
    // Validação do responsável
    if (!formData.responsavel.trim()) {
      newErrors.responsavel = 'Nome do responsável é obrigatório';
    }
    
    // Validação da quantidade de pallets
    const qtdPallets = Number(formData.qtdPallets);
    if (isNaN(qtdPallets) || qtdPallets <= 0) {
      newErrors.qtdPallets = 'A quantidade de pallets deve ser maior que zero';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      enqueueSnackbar('Por favor, corrija os erros no formulário', { variant: 'warning' });
      return;
    }
    
    setLoading(true);
    try {
      // Gerar número de manifesto temporário (será substituído pelo número gerado no servidor)
      const numeroManifesto = 'TEMP-' + Date.now();
      
      const dadosControle = {
        motorista: formData.motorista.trim(),
        cpfMotorista: formData.cpfMotorista.replace(/[\D]/g, ''),
        responsavel: formData.responsavel.trim(),
        transportadora: formData.transportadora,
        qtdPallets: Number(formData.qtdPallets) || 1,
        observacao: formData.observacao.trim(),
        numeroManifesto // Será substituído pelo número gerado no servidor
      };
      
      console.log('Enviando dados para a API:', dadosControle);
      
      const controle = await criarControle(dadosControle);
      
      enqueueSnackbar('Controle criado com sucesso!', { variant: 'success' });
      router.push(`/vincular-notas?id=${controle.id}`);
    } catch (error: any) {
      console.error('Erro ao criar controle:', error);
      
      let errorMessage = 'Erro ao criar controle. Tente novamente.';
      
      if (error.response) {
        // Erro da API com resposta
        const { data } = error.response;
        if (data?.error) {
          errorMessage = data.error;
          if (data.requiredFields) {
            errorMessage += `\nCampos obrigatórios: ${data.requiredFields.join(', ')}`;
          }
        }
      } else if (error.request) {
        // Erro de rede (sem resposta)
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
      } else if (error.message) {
        // Outros erros
        errorMessage = error.message;
      }
      
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 5000,
        style: { whiteSpace: 'pre-line' }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Novo Controle de Carga
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <TextField
            label="Nome do Motorista"
            name="motorista"
            value={formData.motorista}
            onChange={handleChange}
            fullWidth
            required
            error={!!errors.motorista}
            helperText={errors.motorista}
          />
          
          <TextField
            label="CPF do Motorista"
            name="cpfMotorista"
            value={formData.cpfMotorista}
            onChange={handleChange}
            fullWidth
            required
            error={!!errors.cpfMotorista}
            helperText={errors.cpfMotorista || 'Apenas números'}
            inputProps={{
              maxLength: 11
            }}
          />
          
          <TextField
            label="Responsável"
            name="responsavel"
            value={formData.responsavel}
            onChange={handleChange}
            fullWidth
            required
            error={!!errors.responsavel}
            helperText={errors.responsavel}
          />
          
          <FormControl fullWidth error={!!errors.transportadora}>
            <InputLabel>Transportadora</InputLabel>
            <Select
              name="transportadora"
              value={formData.transportadora}
              onChange={handleChange}
              label="Transportadora"
            >
              {Object.values(Transportadora).map((t) => (
                <MenuItem key={t} value={t}>
                  {t.split('_').join(' ')}
                </MenuItem>
              ))}
            </Select>
            {errors.transportadora && (
              <FormHelperText>{errors.transportadora}</FormHelperText>
            )}
          </FormControl>
          
          <TextField
            label="Quantidade de Pallets"
            name="qtdPallets"
            type="number"
            value={formData.qtdPallets}
            onChange={handleChange}
            fullWidth
            inputProps={{ min: 1 }}
          />
          
          <TextField
            label="Observações"
            name="observacao"
            value={formData.observacao}
            onChange={handleChange}
            fullWidth
            multiline
            rows={2}
          />
        </Box>
        
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar e Continuar'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default CriarControlePage;
