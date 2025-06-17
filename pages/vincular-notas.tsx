import React, { useState, useEffect, useCallback } from 'react';
import { useStore, NotaFiscal } from '../store/store';
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
  DialogActions
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';

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
        enqueueSnackbar('Erro ao atualizar o controle', { 
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

  // Função para formatar CPF (000.000.000-00)
  const formatarCPF = (cpf: string): string => {
    // Remove tudo que não for dígito
    const numeros = cpf.replace(/\D/g, '');
    
    // Limita a 11 dígitos
    const cpfLimitado = numeros.slice(0, 11);
    
    // Aplica a formatação
    return cpfLimitado
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Função para validar CPF
  const validarCPF = (cpf: string): { valido: boolean; mensagem?: string } => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpfLimpo.length !== 11) {
      return { 
        valido: false, 
        mensagem: 'CPF deve conter 11 dígitos numéricos.' 
      };
    }
    
    // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
    if (/^(\d)\1+$/.test(cpfLimpo)) {
      return { 
        valido: false, 
        mensagem: 'CPF inválido.' 
      };
    }
    
    // Validação dos dígitos verificadores
    let soma = 0;
    let resto;
    
    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      soma = soma + parseInt(cpfLimpo.substring(i - 1, i)) * (11 - i);
    }
    resto = (soma * 10) % 11;
    
    if ((resto === 10) || (resto === 11)) {
      resto = 0;
    }
    
    if (resto !== parseInt(cpfLimpo.substring(9, 10))) {
      return { 
        valido: false, 
        mensagem: 'CPF inválido.' 
      };
    }
    
    // Segundo dígito verificador
    soma = 0;
    for (let i = 1; i <= 10; i++) {
      soma = soma + parseInt(cpfLimpo.substring(i - 1, i)) * (12 - i);
    }
    
    resto = (soma * 10) % 11;
    
    if ((resto === 10) || (resto === 11)) {
      resto = 0;
    }
    
    if (resto !== parseInt(cpfLimpo.substring(10, 11))) {
      return { 
        valido: false, 
        mensagem: 'CPF inválido.' 
      };
    }
    
    return { valido: true };
  };

  // Função para lidar com mudanças no CPF
  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCPF(e.target.value);
    setCpfMotorista(valorFormatado);
  }, []);

  // Função para formatar o CPF ao sair do campo
  const handleCpfBlur = useCallback(() => {
    if (cpfMotorista) {
      const cpfLimpo = cpfMotorista.replace(/\D/g, '');
      if (cpfLimpo.length === 11) {
        setCpfMotorista(formatarCPF(cpfLimpo));
      }
    }
  }, [cpfMotorista]);

  const handleVincular = async () => {
    setOpenConfirmDialog(true);
  };

  const handleAtualizar = async (): Promise<boolean> => {
    try {
      console.log('Chamando atualizarControle com dados:', {
        motorista,
        cpfMotorista: cpfMotorista.replace(/\D/g, ''),
        transportadora,
        responsavel,
        observacao,
        qtdPallets: Number(qtdPallets) || 0,
        numeroManifesto
      });
      
      // Atualiza o estado global
      const resultado = await atualizarControle(controleId, {
        motorista,
        cpfMotorista: cpfMotorista.replace(/\D/g, ''),
        transportadora,
        responsavel,
        observacao,
        qtdPallets: Number(qtdPallets) || 0,
        numeroManifesto, // Incluindo o número do manifesto na atualização
      });

      // Se houver notas selecionadas, faz a vinculação
      console.log('Controle atualizado com sucesso, resultado:', resultado);
      
      if (notasSelecionadas.length > 0) {
        console.log('Vinculando notas:', notasSelecionadas);
        await vincularNotas(controleId, notasSelecionadas);
        console.log('Notas vinculadas com sucesso');
      }

      return true;
    } catch (error) {
      console.error('Erro ao atualizar controle:', error);
      throw error;
    }
  };

  const handleCriar = async (): Promise<boolean> => {
    try {
      // Cria um novo controle
      await criarControle({
        motorista,
        cpfMotorista: cpfMotorista.replace(/\D/g, ''),
        transportadora,
        responsavel,
        observacao,
        qtdPallets: Number(qtdPallets) || 0,
        notasIds: notasSelecionadas
      });

      return true;
    } catch (error) {
      console.error('Erro ao criar controle:', error);
      throw error;
    }
  };

  const handleConfirmSave = async () => {
    console.log('Iniciando salvamento...');
    setOpenConfirmDialog(false);
    
    try {
      setLoading(true);
      
      console.log('Dados do formulário:', {
        motorista,
        cpfMotorista,
        responsavel,
        transportadora,
        numeroManifesto,
        qtdPallets,
        observacao,
        notasSelecionadas
      });
      
      // Verifica se é um novo controle e não há notas selecionadas
      if (!controleId && notasSelecionadas.length === 0) {
        enqueueSnackbar('Selecione pelo menos uma nota fiscal para criar o controle', { 
          variant: 'warning',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
        setLoading(false);
        return;
      }
      
      // Validação dos campos obrigatórios
      if (!motorista.trim()) {
        enqueueSnackbar('O nome do motorista é obrigatório', { 
          variant: 'warning',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
        setLoading(false);
        return;
      }
      
      if (motorista.trim().length < 3) {
        enqueueSnackbar('O nome do motorista deve ter pelo menos 3 caracteres', { 
          variant: 'warning',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
        setLoading(false);
        return;
      }
      
      if (!responsavel.trim()) {
        enqueueSnackbar('O nome do responsável é obrigatório', { 
          variant: 'warning',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
        setLoading(false);
        return;
      }
      
      if (responsavel.trim().length < 3) {
        enqueueSnackbar('O nome do responsável deve ter pelo menos 3 caracteres', { 
          variant: 'warning',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
        setLoading(false);
        return;
      }
      
      if (!cpfMotorista.trim()) {
        enqueueSnackbar('O CPF do motorista é obrigatório', { 
          variant: 'warning',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
        setLoading(false);
        return;
      }
      
      // Validação do CPF
      const validacaoCPF = validarCPF(cpfMotorista);
      if (!validacaoCPF.valido) {
        enqueueSnackbar(validacaoCPF.mensagem || 'CPF inválido', { 
          variant: 'warning',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        });
        setLoading(false);
        return;
      }
      
      let success = false;
      
      if (controleId) {
        success = await handleAtualizar();
      } else {
        success = await handleCriar();
      }
      
      if (success) {
        enqueueSnackbar(
          `Controle ${controleId ? 'atualizado' : 'criado'} com sucesso!`, 
          { 
            variant: 'success',
            anchorOrigin: { vertical: 'top', horizontal: 'center' }
          }
        );
        
        // Pequeno delay para o usuário ver a mensagem
        setTimeout(() => {
          router.push('/');
        }, 1500);
      }
    } catch (error) {
      console.error('Erro ao processar o controle:', error);
      enqueueSnackbar(
        `Erro ao ${controleId ? 'atualizar' : 'criar'} o controle`, 
        { 
          variant: 'error',
          anchorOrigin: { vertical: 'top', horizontal: 'center' }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {controleId ? 'Editar Controle de Carga' : 'Novo Controle de Carga'}
      </Typography>
      
      {controleId && !controleEncontrado && (
        <Typography color="error">Controle não encontrado</Typography>
      )}
      
      {controleId && (
        <Typography variant="subtitle1" color="textSecondary" gutterBottom>
          Manifesto: {numeroManifesto}
        </Typography>
      )}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              label="Motorista" 
              value={motorista} 
              onChange={(e) => setMotorista(e.target.value)} 
              fullWidth 
              required
              inputProps={{ maxLength: 100 }}
            />
            <TextField 
              label="CPF Motorista" 
              value={cpfMotorista}
              onChange={handleCpfChange}
              onBlur={handleCpfBlur}
              placeholder="000.000.000-00"
              fullWidth 
              required
              inputProps={{ 
                maxLength: 14,
                inputMode: 'numeric',
                pattern: '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}'
              }}
              error={!!cpfMotorista && !validarCPF(cpfMotorista).valido}
              helperText={cpfMotorista && !validarCPF(cpfMotorista).valido ? 'CPF inválido' : ' '}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              select 
              label="Transportadora" 
              value={transportadora} 
              onChange={(e) => setTransportadora(e.target.value as 'ACERT' | 'EXPRESSO_GOIAS')} 
              sx={{ minWidth: 200 }}
              required
            >
              <MenuItem value="ACERT">Acert</MenuItem>
              <MenuItem value="EXPRESSO_GOIAS">Espresso Goiás</MenuItem>
            </TextField>
            <TextField 
              label="Número Manifesto" 
              value={numeroManifesto} 
              InputProps={{ 
                readOnly: true,
                sx: { backgroundColor: '#f5f5f5' }
              }} 
              fullWidth 
            />
            <TextField 
              label="Qtd Pallets" 
              type="number" 
              value={qtdPallets} 
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                setQtdPallets(isNaN(value) ? 0 : Math.max(0, value));
              }} 
              inputProps={{ 
                min: 0,
                step: 1
              }}
              sx={{ maxWidth: 160 }} 
            />
          </Box>
          <Box>
            <TextField 
              label="Responsável" 
              value={responsavel} 
              onChange={(e) => setResponsavel(e.target.value)} 
              fullWidth 
              required
              inputProps={{ maxLength: 100 }}
            />
          </Box>
          <TextField 
            label="Observação" 
            value={observacao} 
            onChange={(e) => setObservacao(e.target.value)} 
            multiline 
            rows={3} 
            fullWidth 
            inputProps={{ maxLength: 500 }}
            helperText={`${observacao.length}/500 caracteres`}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Notas Disponíveis
          </Typography>
          <TextField
            size="small"
            placeholder="Buscar nota ou código..."
            value={buscaNota}
            onChange={(e) => setBuscaNota(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
        <List dense>
          {(Array.isArray(notas) ? (notas as NotaFiscal[]) : [])
            .filter((nota: NotaFiscal) => {
              // Filtra por notas não vinculadas e pela busca
              if (nota.controleId && nota.controleId !== controleId) return false;
              
              if (buscaNota.trim() === '') return true;
              
              const busca = buscaNota.toLowerCase();
              return (
                nota.numeroNota.toLowerCase().includes(busca) ||
                nota.codigo.toLowerCase().includes(busca)
              );
            })
            .map((nota: NotaFiscal) => (
              <ListItem 
                key={nota.id}
                secondaryAction={
                  <Checkbox
                    edge="end"
                    onChange={() => handleToggleNota(nota.id)}
                    checked={notasSelecionadas.includes(nota.id)}
                  />
                }
                sx={{
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                }}
              >
                <ListItemText 
                  primary={
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Chip 
                        label={nota.numeroNota} 
                        size="small" 
                        color="primary"
                        variant="outlined"
                      />
                      <Typography variant="body2" color="text.secondary">
                        Código: {nota.codigo}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {new Date(nota.dataCriacao).toLocaleDateString('pt-BR')}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
            
            {notasSelecionadas.length > 0 && (
              <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                <Chip 
                  label={`${notasSelecionadas.length} nota(s) selecionada(s)`} 
                  color="primary"
                  size="small"
                  onDelete={() => setNotasSelecionadas([])}
                  deleteIcon={<ClearIcon />}
                  sx={{ mr: 1 }}
                />
              </Box>
            )}
          </List>
        </Paper>
                
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button 
          variant="outlined"
          onClick={() => router.push('/listar-controles')}
        >
          Voltar
        </Button>
        <Button 
          variant="contained" 
          size="large"
          onClick={handleVincular}
          disabled={
            loading || 
            !motorista.trim() || 
            !responsavel.trim() || 
            !cpfMotorista.trim() ||
            !validarCPF(cpfMotorista).valido ||
            (!controleId && notasSelecionadas.length === 0)
          }
          startIcon={loading ? <CircularProgress size={20} /> : null}
          color="primary"
        >
          {loading ? 'Salvando...' : 'Salvar Controle'}
        </Button>
      </Box>

      {/* Modal de Confirmação */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        aria-labelledby="confirm-dialog-title"
      >
        <DialogTitle id="confirm-dialog-title">
          {controleId ? 'Confirmar Atualização' : 'Confirmar Criação'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {controleId 
              ? 'Tem certeza que deseja atualizar este controle?'
              : 'Tem certeza que deseja criar um novo controle com as informações fornecidas?'}
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Resumo:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex' }}>
                  <Typography variant="body2" sx={{ width: 120, color: 'text.secondary' }}>Motorista:</Typography>
                  <Typography variant="body2">{motorista}</Typography>
                </Box>
                <Box sx={{ display: 'flex' }}>
                  <Typography variant="body2" sx={{ width: 120, color: 'text.secondary' }}>CPF:</Typography>
                  <Typography variant="body2">{cpfMotorista}</Typography>
                </Box>
                <Box sx={{ display: 'flex' }}>
                  <Typography variant="body2" sx={{ width: 120, color: 'text.secondary' }}>Transportadora:</Typography>
                  <Typography variant="body2">
                    {transportadora === 'ACERT' ? 'Acert' : 'Espresso Goiás'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex' }}>
                  <Typography variant="body2" sx={{ width: 120, color: 'text.secondary' }}>Qtd. Pallets:</Typography>
                  <Typography variant="body2">{qtdPallets}</Typography>
                </Box>
                {notasSelecionadas.length > 0 && (
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>Notas Selecionadas:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {notasSelecionadas.map(notaId => {
                        const nota = (notas || []).find((n: NotaFiscal) => n.id === notaId);
                        return nota ? (
                          <Chip 
                            key={nota.id} 
                            label={nota.numeroNota} 
                            size="small"
                            variant="outlined"
                          />
                        ) : null;
                      })}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirmDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmSave}
            color="primary"
            variant="contained"
            autoFocus
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? (controleId ? 'Atualizando...' : 'Criando...') : (controleId ? 'Atualizar' : 'Criar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VincularNotasPage;
