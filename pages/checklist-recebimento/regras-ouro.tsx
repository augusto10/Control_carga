import { Container, Stack, Typography } from '@mui/material';

export default function ChecklistRegrasOuroPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>
          Checklist de Recebimento
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Inicie um novo checklist de recebimento.
        </Typography>
      </Stack>
    </Container>
  );
}
