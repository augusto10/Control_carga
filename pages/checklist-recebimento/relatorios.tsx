import { Container, Stack, Typography } from '@mui/material';

export default function ChecklistRelatoriosPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>
          Relatórios do Checklist
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Consulte os relatórios do checklist de recebimento.
        </Typography>
      </Stack>
    </Container>
  );
}
