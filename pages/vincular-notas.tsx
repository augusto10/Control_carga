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
  MenuItem
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';

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
  const controleId = typeof id === 'string' ? id : '';
  const [motorista, setMotorista] = useState('');
  const [cpfMotorista, setCpfMotorista] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [transportadora, setTransportadora] = useState<'ACERT' | 'EXPRESSO_GOIAS'>('ACERT');
  // O número do manifesto não é editável pelo usuário, será apenas exibido se necessário
  const [numeroManifesto, setNumeroManifesto] = useState('');
  const [qtdPallets, setQtdPallets] = useState<number>(0);
  const [observacao, setObservacao] = useState('');

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

  const handleVincular = async () => {
    if (!motorista.trim() || !responsavel.trim() || !cpfMotorista.trim()) {
      enqueueSnackbar('Preencha todos os campos obrigatórios', { variant: 'warning' });
      return;
    }
    try {
      await atualizarControle(controleId, {
        motorista,
        responsavel,
        cpfMotorista,
        transportadora,
        numeroManifesto,
        qtdPallets,
        observacao,
      });
      await vincularNotas(controleId, notasSelecionadas);
      enqueueSnackbar('Controle salvo!', { variant: 'success' });
      router.push('/listar-controles');
    } catch (e) {
      enqueueSnackbar('Erro ao salvar controle', { variant: 'error' });
    }
  };

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
            <TextField label="Motorista" value={motorista} onChange={(e)=>setMotorista(e.target.value)} fullWidth />
            <TextField label="CPF Motorista" value={cpfMotorista} onChange={(e)=>setCpfMotorista(e.target.value)} fullWidth />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField select label="Transportadora" value={transportadora} onChange={(e)=>setTransportadora(e.target.value as any)} sx={{ minWidth: 200 }}>
              <MenuItem value="ACERT">Acert</MenuItem>
              <MenuItem value="EXPRESSO_GOIAS">Espresso Goiás</MenuItem>
            </TextField>
            <TextField label="Número Manifesto" value={numeroManifesto} InputProps={{ readOnly: true }} fullWidth />
            <TextField label="Qtd Pallets" type="number" value={qtdPallets} onChange={(e)=>setQtdPallets(Number(e.target.value))} sx={{ maxWidth: 160 }} />
          </Box>
          <Box>
            <TextField label="Responsável" value={responsavel} onChange={(e)=>setResponsavel(e.target.value)} fullWidth />
          </Box>
          <TextField label="Observação" value={observacao} onChange={(e)=>setObservacao(e.target.value)} multiline rows={3} fullWidth />
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
