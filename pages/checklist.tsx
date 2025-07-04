import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Box 
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import Layout from '../components/Layout';

const checklistItemsDefinition = [
  { id: 'pneus', label: 'Pneus (Calibragem / Estado)' },
  { id: 'freios', label: 'Freios (Serviço / Estacionamento)' },
  { id: 'direcao', label: 'Direção' },
  { id: 'luzes', label: 'Luzes (Faróis / Lanternas / Giroflex)' },
  { id: 'buzina', label: 'Buzina e Sinal Sonoro de Ré' },
  { id: 'extintor', label: 'Extintor de Incêndio (Validade / Lacre)' },
  { id: 'vazamentos', label: 'Nível e Vazamentos (Óleo / Gás / Água)' },
  { id: 'torre', label: 'Torre de Elevação e Correntes' },
  { id: 'garfos', label: 'Garfos e Travas' },
  { id: 'bateria', label: 'Bateria (Nível / Conexões)' },
];

const initialItemsState = checklistItemsDefinition.reduce((acc, item) => {
  acc[item.id] = { status: 'ok', observacao: '' };
  return acc;
}, {} as Record<string, { status: string; observacao: string }>);

const ChecklistPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [formData, setFormData] = useState({
    empilhadeiraNumero: '',
    turno: '',
    operadorNome: '',
    horimetroInicial: '',
    horimetroFinal: '',
    observacoesGerais: '',
    itens: initialItemsState,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name!]: value }));
  };

  const handleItemChange = (itemId: string, field: 'status' | 'observacao', value: string) => {
    setFormData(prev => ({
      ...prev,
      itens: {
        ...prev.itens,
        [itemId]: {
          ...prev.itens[itemId],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/checklist/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao salvar o checklist');
      }

      enqueueSnackbar('Checklist salvo com sucesso!', { variant: 'success' });
      router.push('/'); // Redireciona para a home ou outra página

    } catch (error: any) {
      enqueueSnackbar(error.message, { variant: 'error' });
    }
  };

  if (status === 'loading') {
    return <p>Carregando...</p>;
  }

  if (status === 'unauthenticated') {
    router.push('/api/auth/signin');
    return null;
  }

  return (
    <Layout>
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Checklist de Empilhadeira
          </Typography>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="empilhadeiraNumero"
                  label="Nº da Empilhadeira"
                  required
                  fullWidth
                  value={formData.empilhadeiraNumero}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth required>
                  <InputLabel>Turno</InputLabel>
                  <Select name="turno" value={formData.turno} label="Turno" onChange={handleChange as any}>
                    <MenuItem value="Manhã">Manhã</MenuItem>
                    <MenuItem value="Tarde">Tarde</MenuItem>
                    <MenuItem value="Noite">Noite</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="operadorNome"
                  label="Nome do Operador"
                  required
                  fullWidth
                  value={formData.operadorNome}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="horimetroInicial"
                  label="Horímetro Inicial"
                  type="number"
                  required
                  fullWidth
                  value={formData.horimetroInicial}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="horimetroFinal"
                  label="Horímetro Final (Opcional)"
                  type="number"
                  fullWidth
                  value={formData.horimetroFinal}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>

            <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2 }}>
              Itens de Verificação
            </Typography>

            {checklistItemsDefinition.map(item => (
              <Paper key={item.id} sx={{ p: 2, mb: 2, border: '1px solid #ddd' }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1">{item.label}</Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl component="fieldset">
                      <RadioGroup row name={`${item.id}-status`} value={formData.itens[item.id].status} onChange={(e) => handleItemChange(item.id, 'status', e.target.value)}>
                        <FormControlLabel value="ok" control={<Radio />} label="OK" />
                        <FormControlLabel value="nok" control={<Radio />} label="NC" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <TextField
                      label="Observação"
                      fullWidth
                      size="small"
                      value={formData.itens[item.id].observacao}
                      onChange={(e) => handleItemChange(item.id, 'observacao', e.target.value)}
                      disabled={formData.itens[item.id].status === 'ok'}
                    />
                  </Grid>
                </Grid>
              </Paper>
            ))}

            <TextField
              name="observacoesGerais"
              label="Observações Gerais"
              multiline
              rows={4}
              fullWidth
              sx={{ mt: 3 }}
              value={formData.observacoesGerais}
              onChange={handleChange}
            />

            <Box sx={{ mt: 4, textAlign: 'right' }}>
              <Button type="submit" variant="contained" color="primary" size="large">
                Salvar Checklist
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>
    </Layout>
  );
};

export default ChecklistPage;
