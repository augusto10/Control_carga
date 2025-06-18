import React, { useState, useEffect } from 'react';
import { useStore } from '../store/store';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  Divider,
  TextField,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';

interface Nota {
  id: string;
  numeroNota: string;
  codigo: string;
  valor: number;
  controleId?: string;
}
import RefreshIcon from '@mui/icons-material/Refresh';

const VincularNotasPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const { id } = router.query as { id?: string };
  
  const { 
    notas, 
    fetchNotas, 
    fetchControles,
    vincularNotas,
    atualizarControle
  } = useStore();
  
  const [notasSelecionadas, setNotasSelecionadas] = useState<string[]>([]);
  const controleId = Array.isArray(id) ? id[0] || '' : id || '';
  const [motorista, setMotorista] = useState<string>('');
  const [cpfMotorista, setCpfMotorista] = useState<string>('');
  const [responsavel, setResponsavel] = useState<string>('');
  const [transportadora, setTransportadora] = useState<'ACERT' | 'EXPRESSO_GOIAS'>('ACERT');
  const [numeroManifesto, setNumeroManifesto] = useState<string>('');
  const [qtdPallets, setQtdPallets] = useState<number>(0);
  const [observacao, setObservacao] = useState<string>('');
  const [erros, setErros] = useState<Record<string, string>>({});

  const validarCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[\D]/g, '');
    
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    const digitoVerificador1 = resto >= 10 ? 0 : resto;
    
    if (digitoVerificador1 !== parseInt(cpf.charAt(9))) return false;
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    const digitoVerificador2 = resto >= 10 ? 0 : resto;
    
    return digitoVerificador2 === parseInt(cpf.charAt(10));
  };
  
  const formatarCPF = (cpf: string): string => {
    return cpf
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  useEffect(() => {
    fetchNotas();
  }, [fetchNotas]);

  const handleToggleNota = (notaId: string) => {
    const currentIndex = notasSelecionadas.indexOf(notaId);
    const newSelecionadas = [...notasSelecionadas];

    if (currentIndex === -1) {
      newSelecionadas.push(notaId);
    } else {
      newSelecionadas.splice(currentIndex, 1);
    }

    setNotasSelecionadas(newSelecionadas);
  };

  const validarFormulario = (): boolean => {
    const novosErros: Record<string, string> = {};
    
    if (!motorista.trim()) {
      novosErros.motorista = 'Motorista é obrigatório';
    }
    
    if (!responsavel.trim()) {
      novosErros.responsavel = 'Responsável é obrigatório';
    }
    
    if (!cpfMotorista.trim()) {
      novosErros.cpfMotorista = 'CPF é obrigatório';
    } else if (!validarCPF(cpfMotorista)) {
      novosErros.cpfMotorista = 'CPF inválido';
    }
    
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleVincular = async () => {
    if (!validarFormulario()) {
      enqueueSnackbar('Corrija os erros antes de salvar', { variant: 'warning' });
      return;
    }
    
    try {
      await atualizarControle(controleId, {
        motorista: motorista.trim(),
        responsavel: responsavel.trim(),
        cpfMotorista: cpfMotorista.replace(/\D/g, ''),
        transportadora,
        numeroManifesto,
        qtdPallets,
        observacao: observacao.trim(),
      });
      
      if (notasSelecionadas.length > 0) {
        await vincularNotas(controleId, notasSelecionadas);
      }
      
      enqueueSnackbar('Controle salvo com sucesso!', { variant: 'success' });
      router.push('/listar-controles');
    } catch (e) {
      console.error('Erro ao salvar controle:', e);
      enqueueSnackbar('Erro ao salvar controle. Tente novamente.', { variant: 'error' });
    }
  };
// Adicione este botão no seu componente VincularNotasPage
const handleAtualizarNotas = () => {
  fetchNotas();
  enqueueSnackbar('Atualizando lista de notas...', { variant: 'info' });
};

// No seu JSX, adicione este botão
<Box sx={{ mb: 2 }}>
  <Button 
    variant="outlined"
    onClick={handleAtualizarNotas}
    startIcon={<RefreshIcon />}
  >
    Atualizar Lista de Notas
  </Button>
</Box>
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Vincular Notas ao Controle
        </Typography>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              label="Motorista" 
              value={motorista} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMotorista(e.target.value)}
              error={!!erros.motorista}
              helperText={erros.motorista}
              fullWidth 
              required
            />
            <TextField 
              label="CPF Motorista" 
              value={formatarCPF(cpfMotorista)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setCpfMotorista(e.target.value.replace(/\D/g, ''));
              }}
              error={!!erros.cpfMotorista}
              helperText={erros.cpfMotorista || 'Apenas números'}
              fullWidth 
              required
              placeholder="000.000.000-00"
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              select 
              label="Transportadora" 
              value={transportadora} 
              onChange={(e: SelectChangeEvent<'ACERT' | 'EXPRESSO_GOIAS'>) => 
                setTransportadora(e.target.value as 'ACERT' | 'EXPRESSO_GOIAS')
              } 
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="ACERT">Acert</MenuItem>
              <MenuItem value="EXPRESSO_GOIAS">Expresso Goiás</MenuItem>
            </TextField>
            <TextField 
              label="Número Manifesto" 
              value={numeroManifesto} 
              InputProps={{ readOnly: true }} 
              fullWidth 
            />
            <TextField 
              label="Qtd Pallets" 
              type="number" 
              value={qtdPallets} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setQtdPallets(Math.max(0, parseInt(e.target.value) || 0))
              } 
              sx={{ maxWidth: 160 }} 
              inputProps={{ min: 0 }}
            />
          </Box>
          <Box>
            <TextField 
              label="Responsável" 
              value={responsavel} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setResponsavel(e.target.value)}
              error={!!erros.responsavel}
              helperText={erros.responsavel}
              fullWidth 
              required
            />
          </Box>
          <TextField 
            label="Observação" 
            value={observacao} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setObservacao(e.target.value)} 
            multiline 
            rows={3} 
            fullWidth 
          />
        </Box>
        <Typography variant="h6" gutterBottom>
          Notas Disponíveis:
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <List>
          {(Array.isArray(notas) ? notas : [])
            .filter((nota) => !nota.controleId)
            .map((nota) => (
              <ListItem key={nota.id}>
                <ListItemText 
                  primary={`Nota: ${nota.numeroNota}`}
                  secondary={`Código: ${nota.codigo}`} 
                />
                <ListItemSecondaryAction>
                  <Checkbox
                    edge="end"
                    onChange={() => handleToggleNota(nota.id)}
                    checked={notasSelecionadas.indexOf(nota.id) !== -1}
                    inputProps={{ 'aria-label': `Selecionar nota ${nota.numeroNota}` } as React.InputHTMLAttributes<HTMLInputElement>}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            ))}
        </List>
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          size="large"
          onClick={handleVincular}
          disabled={notasSelecionadas.length === 0}
        >
          Vincular Notas Selecionadas
        </Button>
      </Box>
    </Container>
  );
};

export default VincularNotasPage;
