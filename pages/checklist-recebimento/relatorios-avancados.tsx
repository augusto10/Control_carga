import { Container, Stack, Typography } from '@mui/material';

export default function ChecklistRelatoriosAvancadosPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>
          Relatórios Avançados
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Visualize análises avançadas do checklist de recebimento.
        </Typography>
      </Stack>
    </Container>
  );
}
