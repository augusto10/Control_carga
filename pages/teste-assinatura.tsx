import React, { useState, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  Stack,
  Chip,
  alpha,
  useTheme
} from '@mui/material';
import Layout from '../components/Layout';
import SignaturePadPro, { SignaturePadProHandles } from '../components/SignaturePadPro';
import ModalAssinaturaDigitalPro from '../components/ModalAssinaturaDigitalPro';
import SaveIcon from '@mui/icons-material/Save';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const TesteAssinatura: React.FC = () => {
  const theme = useTheme();
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'motorista' | 'responsavel'>('motorista');
  const signatureRef = useRef<SignaturePadProHandles>(null);

  const handleSaveSignature = async (signature: string) => {
    console.log('Assinatura salva:', signature.substring(0, 50) + '...');
    setSavedSignature(signature);
  };

  const handleClearSaved = () => {
    setSavedSignature(null);
  };

  const handleOpenModal = (type: 'motorista' | 'responsavel') => {
    setModalType(type);
    setModalOpen(true);
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom color="primary">
            Teste do Novo Componente de Assinatura
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            Este é um ambiente de teste para o novo componente de assinatura digital 
            que funciona perfeitamente em PC, tablet e celular.
          </Typography>

          <Divider sx={{ my: 3 }} />

          {/* Recursos do componente */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              ✨ Recursos Implementados
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              <Chip label="📱 Responsivo" color="primary" variant="outlined" />
              <Chip label="↩️ Undo/Redo" color="primary" variant="outlined" />
              <Chip label="🎨 Cores Personalizáveis" color="primary" variant="outlined" />
              <Chip label="📏 Espessura Ajustável" color="primary" variant="outlined" />
              <Chip label="💾 Salvamento Seguro" color="primary" variant="outlined" />
              <Chip label="🖱️ Mouse & Touch" color="primary" variant="outlined" />
              <Chip label="📐 Auto-resize" color="primary" variant="outlined" />
              <Chip label="🚀 Performance Otimizada" color="primary" variant="outlined" />
            </Stack>
          </Box>

          <Grid container spacing={3}>
            {/* Teste Inline */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    1. Teste Inline do Componente
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Teste o componente diretamente nesta página
                  </Typography>
                  
                  <Box sx={{ mt: 3 }}>
                    <SignaturePadPro
                      ref={signatureRef}
                      label="Assinatura de Teste"
                      onSave={handleSaveSignature}
                      value={savedSignature || undefined}
                      showSaveButton={true}
                      penColor="#1976d2"
                      minWidth={0.5}
                      maxWidth={3}
                    />
                  </Box>

                  {savedSignature && (
                    <Alert 
                      severity="success" 
                      variant="standard"
                      sx={{ 
                        mt: 2,
                        borderRadius: '16px',
                        backdropFilter: 'blur(12px)',
                        backgroundColor: alpha(theme.palette.success.main, 0.15),
                        color: theme.palette.success.dark,
                        border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                        '& .MuiAlert-icon': {
                          color: theme.palette.success.main,
                        },
                        boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                        fontWeight: 600,
                      }}
                      action={
                        <Button 
                          color="inherit" 
                          size="small"
                          onClick={handleClearSaved}
                          sx={{ fontWeight: 600 }}
                        >
                          Limpar
                        </Button>
                      }
                    >
                      <Typography variant="body2">
                        Assinatura salva com sucesso! 
                      </Typography>
                      <Box
                        component="img"
                        src={savedSignature}
                        alt="Assinatura salva"
                        sx={{
                          maxWidth: '100%',
                          maxHeight: 60,
                          mt: 1,
                          border: '1px solid',
                          borderColor: alpha(theme.palette.success.main, 0.3),
                          borderRadius: 2,
                          backgroundColor: alpha(theme.palette.common.white, 0.5),
                          p: 0.5
                        }}
                      />
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Teste Modal Motorista */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    2. Teste Modal - Motorista
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Simula a assinatura do motorista em um controle de carga
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => handleOpenModal('motorista')}
                    fullWidth
                  >
                    Abrir Modal Motorista
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Teste Modal Responsável */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    3. Teste Modal - Responsável
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Simula a assinatura do responsável pela entrega
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => handleOpenModal('responsavel')}
                    fullWidth
                  >
                    Abrir Modal Responsável
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Instruções de Teste */}
            <Grid item xs={12}>
              <Card sx={{ backgroundColor: '#f5f5f5' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📋 Instruções de Teste
                  </Typography>
                  <Typography variant="body2" component="div">
                    <ol>
                      <li>
                        <strong>Desktop:</strong> Use o mouse para desenhar a assinatura
                      </li>
                      <li>
                        <strong>Mobile/Tablet:</strong> Use o dedo ou caneta stylus para assinar
                      </li>
                      <li>
                        <strong>Undo/Redo:</strong> Use os botões de desfazer/refazer para corrigir
                      </li>
                      <li>
                        <strong>Limpar:</strong> Remove toda a assinatura
                      </li>
                      <li>
                        <strong>Salvar:</strong> Converte a assinatura em imagem PNG base64
                      </li>
                    </ol>
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" gutterBottom>
                    🔧 Características Técnicas
                  </Typography>
                  <Typography variant="body2" component="div">
                    <ul>
                      <li>Biblioteca: <code>signature_pad</code> (nativa, não React wrapper)</li>
                      <li>Formato de saída: PNG base64</li>
                      <li>Suporte a High DPI/Retina displays</li>
                      <li>Throttling de eventos para performance</li>
                      <li>Auto-resize ao rotacionar dispositivo</li>
                      <li>Velocidade e pressão adaptativas</li>
                    </ul>
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      </Container>

      {/* Modal de teste */}
      <ModalAssinaturaDigitalPro
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        controleId="teste-123"
        tipoAssinatura={modalType}
        onAssinaturaSalva={() => {
          console.log(`Assinatura do ${modalType} salva!`);
        }}
      />
    </Layout>
  );
};

export default TesteAssinatura;
