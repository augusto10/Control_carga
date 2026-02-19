import React, { useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Alert
} from '@mui/material';
import AssinaturaSimples from '../components/AssinaturaSimples';
import ModalAssinaturaSimplesAlternativo from '../components/ModalAssinaturaSimplesAlternativo';

const TesteAssinaturaSimples: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [assinaturaSalva, setAssinaturaSalva] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSaveAssinatura = async (signature: string) => {
    console.log('Assinatura recebida:', signature.substring(0, 50) + '...');
    setAssinaturaSalva(signature);
    setMessage('Assinatura salva com sucesso!');
  };

  const handleModalSave = () => {
    setMessage('Assinatura do modal salva com sucesso!');
    setModalOpen(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Teste de Assinatura Digital
        </Typography>

        <Typography variant="body1" paragraph>
          Esta página é para testar o funcionamento da assinatura digital.
        </Typography>

        {message && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message}
          </Alert>
        )}

        {/* Teste do componente direto */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Teste 1: Componente Direto
          </Typography>
          <AssinaturaSimples
            onSave={handleSaveAssinatura}
            label="Teste de Assinatura Direta"
          />
        </Paper>

        {/* Teste do modal */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Teste 2: Modal de Assinatura
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setModalOpen(true)}
          >
            Abrir Modal de Assinatura
          </Button>
        </Paper>

        {/* Resultado */}
        {assinaturaSalva && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Assinatura Capturada:
            </Typography>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <img
                src={assinaturaSalva}
                alt="Assinatura"
                style={{
                  maxWidth: '100%',
                  maxHeight: '200px',
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
              />
            </Box>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              Tamanho: {assinaturaSalva.length} caracteres
            </Typography>
          </Paper>
        )}

        {/* Modal de teste */}
        <ModalAssinaturaSimplesAlternativo
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          controleId="teste-123"
          tipoAssinatura="motorista"
          onAssinaturaSalva={handleModalSave}
        />
      </Container>
  );
};

export default TesteAssinaturaSimples;
