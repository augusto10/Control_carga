import { useState } from 'react';
import { Container, Typography, Box, Paper, Checkbox, FormGroup, FormControlLabel, Button, Grid } from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useRouter } from 'next/router';

const checklistItems = [
  'Verificar nível de óleo',
  'Checar pneus',
  'Testar buzina',
  'Verificar luzes de sinalização',
  'Checar freios',
  'Inspecionar garfos',
  'Verificar bateria (elétricas)',
  'Checar vazamentos',
  'Testar marcha ré',
  'Conferir extintor de incêndio',
];

export default function ChecklistEmpilhadeiras() {
  const [checked, setChecked] = useState<boolean[]>(Array(checklistItems.length).fill(false));
  const [horasUso, setHorasUso] = useState('');
  const [dataUltimaManutencao, setDataUltimaManutencao] = useState('');
  const router = useRouter();

  const handleChange = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const updated = [...checked];
    updated[index] = event.target.checked;
    setChecked(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Checklist enviado com sucesso!');
    setChecked(Array(checklistItems.length).fill(false));
    setHorasUso('');
    setDataUltimaManutencao('');
    // Aqui pode ser feita integração com backend futuramente
  };

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4 }}>
        <Box textAlign="center" mb={3}>
          <AssignmentTurnedInIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Checklist de Empilhadeiras
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Antes de iniciar a operação, preencha todos os itens abaixo:
          </Typography>
        </Box>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={6}>
              <label htmlFor="horas-uso">
                <Typography fontWeight={500} gutterBottom>Horas de uso *</Typography>
                <input
                  id="horas-uso"
                  type="number"
                  min={0}
                  value={horasUso}
                  onChange={e => setHorasUso(e.target.value)}
                  required
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
                />
              </label>
            </Grid>
            <Grid item xs={12} sm={6}>
              <label htmlFor="data-ultima-manutencao">
                <Typography fontWeight={500} gutterBottom>Data da última manutenção *</Typography>
                <input
                  id="data-ultima-manutencao"
                  type="date"
                  value={dataUltimaManutencao}
                  onChange={e => setDataUltimaManutencao(e.target.value)}
                  required
                  style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
                />
              </label>
            </Grid>
          </Grid>
          <FormGroup>
            <Grid container spacing={2}>
              {checklistItems.map((item, idx) => (
                <Grid item xs={12} key={item}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={checked[idx]}
                        onChange={handleChange(idx)}
                        color="primary"
                        inputProps={{ 'aria-label': item }}
                      />
                    }
                    label={<Typography>{item}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>
          <Box mt={4} textAlign="center">
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={!checked.every(Boolean) || !horasUso || !dataUltimaManutencao}
            >
              Enviar Checklist
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
}
