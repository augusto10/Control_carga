import { Container, Stack, Typography } from '@mui/material';

export default function ChecklistRelatorioValidadePage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>
          Alertas de Validade
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Acompanhe alertas de validade dos produtos recebidos.
        </Typography>
      </Stack>
    </Container>
  );
}
