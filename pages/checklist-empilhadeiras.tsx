import { useState } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Checkbox, 
  FormGroup, 
  FormControlLabel, 
  Button, 
  Grid,
  TextField,
  Stack,
  Avatar,
  alpha,
  useTheme
} from '@mui/material';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/ProtectedRoute';
import { motion } from 'framer-motion';

const MotionPaper = motion(Paper);

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

function ChecklistContent() {
  const theme = useTheme();
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
    // Aqui pode ser feita integração com backend futuramente
    alert('Checklist enviado com sucesso!');
    setChecked(Array(checklistItems.length).fill(false));
    setHorasUso('');
    setDataUltimaManutencao('');
  };

  const allChecked = checked.every(item => item);

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header Section */}
      <MotionPaper
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          backdropFilter: 'blur(10px)'
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
            }}
          >
            <AssignmentTurnedInIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
              Checklist de Empilhadeiras
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Verificação de segurança antes de iniciar a operação
            </Typography>
          </Box>
        </Stack>
      </MotionPaper>

      {/* Form Section */}
      <Box component="form" onSubmit={handleSubmit}>
        <MotionPaper
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: '24px',
            border: '1px solid',
            borderColor: alpha('#e2e8f0', 0.6),
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
          }}
        >
        <Stack spacing={4}>
          {/* Informações Adicionais */}
          <Box>
            <Typography variant="h6" fontWeight="600" color="#1e293b" gutterBottom>
              Informações da Operação
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Horas de Uso"
                  type="number"
                  fullWidth
                  value={horasUso}
                  onChange={(e) => setHorasUso(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Data da Última Manutenção"
                  type="date"
                  fullWidth
                  value={dataUltimaManutencao}
                  onChange={(e) => setDataUltimaManutencao(e.target.value)}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Checklist Items */}
          <Box>
            <Typography variant="h6" fontWeight="600" color="#1e293b" gutterBottom>
              Itens de Verificação
            </Typography>
            <FormGroup>
              {checklistItems.map((item, index) => (
                <MotionPaper
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    background: checked[index] 
                      ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.05)} 0%, ${alpha(theme.palette.success.light, 0.05)} 100%)`
                      : alpha(theme.palette.background.paper, 0.8),
                    transition: 'all 0.3s ease-in-out',
                    '&:hover': {
                      background: checked[index]
                        ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.light, 0.1)} 100%)`
                        : alpha(theme.palette.action.hover, 0.04),
                      borderColor: checked[index] ? alpha(theme.palette.success.main, 0.3) : alpha(theme.palette.divider, 0.2),
                    }
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={checked[index]}
                        onChange={handleChange(index)}
                        sx={{
                          color: checked[index] ? theme.palette.success.main : theme.palette.action.disabled,
                          '&.Mui-checked': {
                            color: theme.palette.success.main,
                          },
                        }}
                      />
                    }
                    label={
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: checked[index] ? 600 : 400,
                          color: checked[index] ? theme.palette.success.dark : theme.palette.text.primary,
                          textDecoration: checked[index] ? 'none' : 'none'
                        }}
                      >
                        {item}
                      </Typography>
                    }
                  />
                </MotionPaper>
              ))}
            </FormGroup>
          </Box>

          {/* Status Summary */}
          <MotionPaper
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            sx={{
              p: 3,
              borderRadius: 2,
              background: allChecked
                ? `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.light, 0.1)} 100%)`
                : `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.light, 0.1)} 100%)`,
              border: `1px solid ${alpha(allChecked ? theme.palette.success.main : theme.palette.warning.main, 0.2)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <AssignmentTurnedInIcon 
                sx={{ 
                  fontSize: 32,
                  color: allChecked ? theme.palette.success.main : theme.palette.warning.main
                }} 
              />
              <Box>
                <Typography variant="h6" fontWeight="600" color={allChecked ? theme.palette.success.dark : theme.palette.warning.dark}>
                  {allChecked ? 'Todos os itens verificados!' : 'Verificação incompleta'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {checked.filter(item => item).length} de {checklistItems.length} itens verificados
                </Typography>
              </Box>
            </Stack>
          </MotionPaper>

          {/* Action Buttons */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Button
              variant="outlined"
              onClick={() => {
                setChecked(Array(checklistItems.length).fill(false));
                setHorasUso('');
                setDataUltimaManutencao('');
              }}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                borderColor: alpha(theme.palette.divider, 0.3),
                color: theme.palette.text.secondary,
                '&:hover': {
                  background: alpha(theme.palette.action.hover, 0.04),
                  borderColor: alpha(theme.palette.divider, 0.5)
                }
              }}
            >
              Limpar Formulário
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!allChecked}
              sx={{
                borderRadius: 2,
                px: 4,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                background: allChecked
                  ? `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`
                  : `linear-gradient(135deg, ${theme.palette.grey[400]} 0%, ${theme.palette.grey[500]} 100%)`,
                boxShadow: allChecked
                  ? `0 4px 20px ${alpha(theme.palette.success.main, 0.3)}`
                  : 'none',
                '&:hover': {
                  background: allChecked
                    ? `linear-gradient(135deg, ${theme.palette.success.dark} 0%, ${theme.palette.success.main} 100%)`
                    : `linear-gradient(135deg, ${theme.palette.grey[500]} 0%, ${theme.palette.grey[400]} 100%)`,
                }
              }}
            >
              Enviar Checklist
            </Button>
          </Stack>
        </Stack>
      </MotionPaper>
      </Box>
    </Container>
  );
}

export default function ChecklistEmpilhadeiras() {
  return (
    <ProtectedRoute>
      <ChecklistContent />
    </ProtectedRoute>
  );
}
