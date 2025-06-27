import React, { useState, useEffect, useCallback } from 'react';
import { useStore, NotaFiscal, type ControleCarga } from '../store/store';
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
  CircularProgress,
  Chip,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  SelectChangeEvent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Nota {
  id: string;
  numeroNota: string;
  codigo: string;
  volumes: string;
  controleId?: string;
}

const VincularNotasPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const { id } = router.query as { id?: string };
  
  const { 
    notas, 
    controles,
    fetchNotas, 
    fetchControles,
    vincularNotas,
    atualizarControle
  } = useStore();
  
  const [notasSelecionadas, setNotasSelecionadas] = useState<string[]>([]);
  const [buscaNota, setBuscaNota] = useState('');
  const controleId = typeof id === 'string' ? id : '';
  const [motorista, setMotorista] = useState('');
  const [cpfMotorista, setCpfMotorista] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [transportadora, setTransportadora] = useState<'ACERT' | 'EXPRESSO_GOIAS'>('ACERT');
  const [numeroManifesto, setNumeroManifesto] = useState('');
  const [qtdPallets, setQtdPallets] = useState<number>(0);
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(true);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [controleEncontrado, setControleEncontrado] = useState<boolean>(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  // Carrega os dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchNotas(),
          fetchControles()
        ]);
        
        // Se estiver editando, carrega os dados do controle
        if (controleId) {
          const controle = controles.find(c => c.id === controleId);
          if (controle) {
            setControleEncontrado(true);
            setMotorista(controle.motorista);
            setCpfMotorista(controle.cpfMotorista);
            setResponsavel(controle.responsavel);
            setTransportadora(controle.transportadora);
            setNumeroManifesto(controle.numeroManifesto);
            setQtdPallets(controle.qtdPallets);
            setObservacao(controle.observacao || '');
            
            // Marca as notas já vinculadas como selecionadas
            const notasVinculadas = controle.notas
              .filter((nota: NotaFiscal) => nota.controleId === controleId)
              .map((nota: NotaFiscal) => nota.id);
            setNotasSelecionadas(notasVinculadas);
          } else {
            setControleEncontrado(false);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        enqueueSnackbar('Erro ao carregar dados. Tente novamente.', { 
          variant: 'error',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [controleId, fetchNotas, fetchControles, controles, enqueueSnackbar]);

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

  const validarCPF = (cpf: string): { valido: boolean; mensagem?: string } => {
    cpf = cpf.replace(/[\D]/g, '');
    
    if (cpf.length !== 11) {
      return { valido: false, mensagem: 'CPF deve ter 11 dígitos' };
    }
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1+$/.test(cpf)) {
      return { valido: false, mensagem: 'CPF inválido' };
    }
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    const digitoVerificador1 = resto >= 10 ? 0 : resto;
    
    if (digitoVerificador1 !== parseInt(cpf.charAt(9))) {
      return { valido: false, mensagem: 'CPF inválido' };
    }
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    const digitoVerificador2 = resto >= 10 ? 0 : resto;
    
    if (digitoVerificador2 !== parseInt(cpf.charAt(10))) {
      return { valido: false, mensagem: 'CPF inválido' };
    }
    
    return { valido: true };
  };
  
  const formatarCPF = (cpf: string): string => {
    return cpf
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCPF(e.target.value);
    setCpfMotorista(valorFormatado);
    
    // Validação em tempo real
    if (valorFormatado.length === 14) { // Formato completo: 000.000.000-00
      const validacao = validarCPF(valorFormatado);
      if (!validacao.valido) {
        setErros(prev => ({ ...prev, cpfMotorista: validacao.mensagem || 'CPF inválido' }));
      } else {
        const novosErros = { ...erros };
        delete novosErros.cpfMotorista;
        setErros(novosErros);
      }
    } else if (valorFormatado.length > 0) {
      setErros(prev => ({ ...prev, cpfMotorista: 'CPF incompleto' }));
    } else {
      const novosErros = { ...erros };
      delete novosErros.cpfMotorista;
      setErros(novosErros);
    }
  }, [erros]);

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
    } else {
      const validacao = validarCPF(cpfMotorista);
      if (!validacao.valido) {
        novosErros.cpfMotorista = validacao.mensagem || 'CPF inválido';
      }
    }
    
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleVincular = () => {
    if (!validarFormulario()) {
      enqueueSnackbar('Corrija os erros antes de salvar', { 
        variant: 'warning',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      return;
    }
    
    setOpenConfirmDialog(true);
  };

  const handleAtualizar = async (): Promise<boolean> => {
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
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar controle:', error);
      enqueueSnackbar('Erro ao atualizar controle. Tente novamente.', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      return false;
    }
  };

  const handleCriar = async (): Promise<boolean> => {
    try {
      const novoControle: ControleCarga | null = await atualizarControle('', {
        motorista: motorista.trim(),
        responsavel: responsavel.trim(),
        cpfMotorista: cpfMotorista.replace(/\D/g, ''),
        transportadora,
        numeroManifesto,
        qtdPallets,
        observacao: observacao.trim(),
      });
      
      if (notasSelecionadas.length > 0 && novoControle?.id) {
        await vincularNotas(novoControle.id, notasSelecionadas);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao criar controle:', error);
      enqueueSnackbar('Erro ao criar controle. Tente novamente.', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      return false;
    }
  };

  const handleConfirmSave = async () => {
    setOpenConfirmDialog(false);
    setLoading(true);
    
    try {
      let sucesso = false;
      
      if (controleId) {
        sucesso = await handleAtualizar();
      } else {
        sucesso = await handleCriar();
      }
      
      if (sucesso) {
        enqueueSnackbar(
          controleId ? 'Controle atualizado com sucesso!' : 'Controle criado com sucesso!', 
          { 
            variant: 'success',
            anchorOrigin: { vertical: 'top', horizontal: 'center' }
          }
        );
        router.push('/listar-controles');
      }
    } catch (error) {
      console.error('Erro ao processar o formulário:', error);
      enqueueSnackbar('Ocorreu um erro ao processar sua solicitação.', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarNotas = () => {
    setLoading(true);
    fetchNotas().finally(() => setLoading(false));
  };

  // Filtra as notas com base no termo de busca
  const notasFiltradas = notas.filter(nota => 
    !buscaNota || 
    nota.numeroNota.toLowerCase().includes(buscaNota.toLowerCase()) ||
    nota.codigo.toLowerCase().includes(buscaNota.toLowerCase())
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (controleId && !controleEncontrado) {
    return (
      <Container maxWidth="lg">
        <Box my={4}>
          <Typography variant="h4" gutterBottom>
            Controle não encontrado
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => router.push('/listar-controles')}
          >
            Voltar para a lista
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" gutterBottom>
          {controleId ? 'Editar Controle' : 'Novo Controle'}
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Dados do Motorista
          </Typography>
          
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <TextField
              label="Motorista"
              value={motorista}
              onChange={(e) => setMotorista(e.target.value)}
              fullWidth
              margin="normal"
              error={!!erros.motorista}
              helperText={erros.motorista}
            />
            
            <TextField
              label="CPF do Motorista"
              value={cpfMotorista}
              onChange={handleCpfChange}
              fullWidth
              margin="normal"
              placeholder="000.000.000-00"
              error={!!erros.cpfMotorista}
              helperText={erros.cpfMotorista}
              inputProps={{ maxLength: 14 }}
            />
            
            <TextField
              label="Responsável"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              fullWidth
              margin="normal"
              error={!!erros.responsavel}
              helperText={erros.responsavel}
            />
          </Box>
          
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <TextField
              select
              label="Transportadora"
              value={transportadora}
              onChange={(e: React.ChangeEvent<{ value: unknown }>) => 
                setTransportadora(e.target.value as 'ACERT' | 'EXPRESSO_GOIAS')
              }
              fullWidth
              margin="normal"
            >
              <MenuItem value="ACERT">ACERT</MenuItem>
              <MenuItem value="EXPRESSO_GOIAS">Expresso Goiás</MenuItem>
            </TextField>
            
            <TextField
              label="Número do Manifesto"
              value={numeroManifesto}
              onChange={(e) => setNumeroManifesto(e.target.value)}
              fullWidth
              margin="normal"
            />
            
            <TextField
              label="Quantidade de Pallets"
              type="number"
              value={qtdPallets}
              onChange={(e) => 
                setQtdPallets(Math.max(0, parseInt(e.target.value) || 0))
              }
              fullWidth
              margin="normal"
              InputProps={{
                inputProps: { min: 0 }
              }}
            />
          </Box>
          
          <TextField
            label="Observações"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            fullWidth
            multiline
            rows={3}
            margin="normal"
          />
        </Paper>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Notas Fiscais
            </Typography>
            <Box display="flex" gap={1}>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={handleAtualizarNotas}
                disabled={loading}
              >
                Atualizar
              </Button>
              <TextField
                placeholder="Buscar nota..."
                value={buscaNota}
                onChange={(e) => setBuscaNota(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  endAdornment: buscaNota && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setBuscaNota('')}
                        edge="end"
                      >
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250 }}
              />
            </Box>
          </Box>
          
          <List>
            {notasFiltradas.length > 0 ? (
              notasFiltradas.map((nota) => (
                <React.Fragment key={nota.id}>
                  <ListItem>
                    <Checkbox
                      checked={notasSelecionadas.includes(nota.id)}
                      onChange={() => handleToggleNota(nota.id)}
                      color="primary"
                    />
                    <ListItemText
                      primary={`Nota: ${nota.numeroNota}`}
                      secondary={`Código: ${nota.codigo} | Volumes: ${nota.volumes || '1'}`}
                    />
                    {nota.controleId && nota.controleId !== controleId && (
                      <Chip 
                        label="Já vinculada" 
                        color="warning" 
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </ListItem>
                  <Divider component="li" />
                </React.Fragment>
              ))
            ) : (
              <ListItem>
                <ListItemText 
                  primary="Nenhuma nota encontrada" 
                  secondary={buscaNota ? 'Tente ajustar sua busca' : 'Faça uma busca para encontrar notas'}
                />
              </ListItem>
            )}
          </List>
        </Paper>
        
        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button 
            variant="outlined" 
            onClick={() => router.push('/listar-controles')}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleVincular}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {controleId ? 'Atualizar' : 'Salvar'}
          </Button>
        </Box>
      </Box>
      
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
      >
        <DialogTitle>
          {controleId ? 'Atualizar Controle?' : 'Criar Novo Controle?'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {controleId 
              ? 'Deseja realmente atualizar este controle com as alterações feitas?'
              : 'Deseja criar um novo controle com as informações fornecidas?'}
          </DialogContentText>
          {notasSelecionadas.length > 0 && (
            <Box mt={2}>
              <Typography variant="subtitle2">Notas selecionadas:</Typography>
              <Typography variant="body2" color="text.secondary">
                {notasSelecionadas.length} nota(s) serão vinculadas a este controle.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleConfirmSave} 
            color="primary"
            variant="contained"
            autoFocus
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VincularNotasPage;
