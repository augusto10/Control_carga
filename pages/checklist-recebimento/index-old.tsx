import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  QrCodeScanner as QrCodeScannerIcon,
  CameraAlt as CameraAltIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

interface Produto {
  id: string;
  nomeFabricante: string;
  descricaoProduto: string;
  numeroLote: string;
  dataFabricacao: string;
  dataVencimento: string;
  admProduto: string;
  codigoBarrasCaixaMaster: string;
  codigoBarrasCaixaInterna: string;
  codigoBarrasItem: string;
}

interface ChecklistData {
  // Dados básicos
  dataRecebimento: string;
  horarioRecebimento: string;
  nomeConferente: string;
  produtos: Produto[];
  
  // Fotos
  fotoRecebimento: File | null;
  fotoDevolucao: File | null;
  
  
  // Perguntas do checklist
  recebimentoPocket: boolean;
  motivoNaoPocket: string;
  possuiCodigoBarras: boolean;
  solicitouCadastroCodigoBarras: boolean;
  paraQuemSolicitou: string;
  dadosLoteCadastradosSantri: boolean;
  condicaoEmbalagens: 'OTIMA' | 'BOA' | 'RUIM' | '';
  houveRessalva: boolean;
  descricaoRessalva: string;
  paraQuemInformouRessalva: string;
  houveDevolucao: boolean;
  itensDevolvidos: string;
  quantidadeDevolvida: number;
  fotoTiradaDevolucao: boolean;
  notaDevolucaoEmitida: boolean;
  numeroNotaDevolucao: string;
}

const ChecklistRecebimentoPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState<ChecklistData>({
    dataRecebimento: new Date().toISOString().split('T')[0],
    horarioRecebimento: new Date().toTimeString().split(' ')[0].substring(0, 5),
    nomeConferente: user?.nome || '',
    produtos: [{
      id: '1',
      nomeFabricante: '',
      descricaoProduto: '',
      numeroLote: '',
      dataFabricacao: '',
      dataVencimento: '',
      admProduto: '',
      codigoBarrasCaixaMaster: '',
      codigoBarrasCaixaInterna: '',
      codigoBarrasItem: ''
    }],
    fotoRecebimento: null,
    fotoDevolucao: null,
    recebimentoPocket: true,
    motivoNaoPocket: '',
    possuiCodigoBarras: true,
    solicitouCadastroCodigoBarras: false,
    paraQuemSolicitou: '',
    dadosLoteCadastradosSantri: true,
    condicaoEmbalagens: '',
    houveRessalva: false,
    descricaoRessalva: '',
    paraQuemInformouRessalva: '',
    houveDevolucao: false,
    itensDevolvidos: '',
    quantidadeDevolvida: 0,
    fotoTiradaDevolucao: false,
    notaDevolucaoEmitida: false,
    numeroNotaDevolucao: ''
  });

  const steps = [
    'Dados Básicos',
    'Códigos de Barras',
    'Verificações',
    'Ressalvas e Devoluções',
    'Finalização'
  ];

  // Verificar se passou pelas regras de ouro
  useEffect(() => {
    const aceitouRegras = sessionStorage.getItem('aceitouRegrasOuro');
    if (!aceitouRegras) {
      router.push('/checklist-recebimento/regras-ouro');
    }
  }, [router]);

  const handleInputChange = (field: keyof ChecklistData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (field: 'fotoRecebimento' | 'fotoDevolucao', file: File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validações básicas
      if (!formData.nomeFabricante || !formData.descricaoProduto || !formData.numeroLote) {
        setSnackbar({ open: true, message: 'Preencha todos os campos obrigatórios', severity: 'error' });
        return;
      }

      // Preparar dados para envio
      const checklistData = new FormData();
      
      // Adicionar dados básicos
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'fotoRecebimento' && key !== 'fotoDevolucao') {
          checklistData.append(key, value?.toString() || '');
        }
      });

      // Adicionar fotos se existirem
      if (formData.fotoRecebimento) {
        checklistData.append('fotoRecebimento', formData.fotoRecebimento);
      }
      if (formData.fotoDevolucao) {
        checklistData.append('fotoDevolucao', formData.fotoDevolucao);
      }

      const response = await fetch('/api/checklist-recebimento', {
        method: 'POST',
        credentials: 'include',
        body: checklistData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.error || `Erro ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      setSnackbar({ open: true, message: 'Checklist salvo com sucesso!', severity: 'success' });
      
      // Redirecionar para lista de checklists após 2 segundos
      setTimeout(() => {
        router.push('/checklist-recebimento/relatorios');
      }, 2000);

    } catch (error) {
      console.error('Erro ao salvar checklist:', error);
      setSnackbar({ open: true, message: 'Erro ao salvar checklist', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data do Recebimento"
                type="date"
                value={formData.dataRecebimento}
                onChange={(e) => handleInputChange('dataRecebimento', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horário do Recebimento"
                type="time"
                value={formData.horarioRecebimento}
                onChange={(e) => handleInputChange('horarioRecebimento', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Conferente"
                value={formData.nomeConferente}
                onChange={(e) => handleInputChange('nomeConferente', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Fabricante"
                value={formData.nomeFabricante}
                onChange={(e) => handleInputChange('nomeFabricante', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição do Produto"
                value={formData.descricaoProduto}
                onChange={(e) => handleInputChange('descricaoProduto', e.target.value)}
                multiline
                rows={2}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Número do Lote"
                value={formData.numeroLote}
                onChange={(e) => handleInputChange('numeroLote', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Data de Fabricação"
                type="date"
                value={formData.dataFabricacao}
                onChange={(e) => handleInputChange('dataFabricacao', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Data de Vencimento"
                type="date"
                value={formData.dataVencimento}
                onChange={(e) => handleInputChange('dataVencimento', e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Códigos de Barras
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="ADM do Produto"
                value={formData.admProduto}
                onChange={(e) => handleInputChange('admProduto', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código de Barras Caixa Master"
                value={formData.codigoBarrasCaixaMaster}
                onChange={(e) => handleInputChange('codigoBarrasCaixaMaster', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código de Barras Caixa Interna"
                value={formData.codigoBarrasCaixaInterna}
                onChange={(e) => handleInputChange('codigoBarrasCaixaInterna', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código de Barras do Item"
                value={formData.codigoBarrasItem}
                onChange={(e) => handleInputChange('codigoBarrasItem', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Fotos do Recebimento
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCameraIcon />}
                fullWidth
                sx={{ height: 56 }}
              >
                {formData.fotoRecebimento ? 'Foto Selecionada' : 'Foto do Recebimento'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleFileChange('fotoRecebimento', e.target.files?.[0] || null)}
                />
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<PhotoCameraIcon />}
                fullWidth
                sx={{ height: 56 }}
              >
                {formData.fotoDevolucao ? 'Foto Selecionada' : 'Foto da Devolução (se houver)'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => handleFileChange('fotoDevolucao', e.target.files?.[0] || null)}
                />
              </Button>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Verificações do Recebimento
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.recebimentoPocket}
                    onChange={(e) => handleInputChange('recebimentoPocket', e.target.checked)}
                  />
                }
                label="O Recebimento foi realizado no Pocket?"
              />
            </Grid>
            
            {!formData.recebimentoPocket && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Por que não foi realizado no Pocket?"
                  value={formData.motivoNaoPocket}
                  onChange={(e) => handleInputChange('motivoNaoPocket', e.target.value)}
                  multiline
                  rows={2}
                  required
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.possuiCodigoBarras}
                    onChange={(e) => handleInputChange('possuiCodigoBarras', e.target.checked)}
                  />
                }
                label="Produto possui código de barras cadastrado?"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.solicitouCadastroCodigoBarras}
                    onChange={(e) => handleInputChange('solicitouCadastroCodigoBarras', e.target.checked)}
                  />
                }
                label="Foi solicitado o cadastro do código de barras?"
              />
            </Grid>

            {formData.solicitouCadastroCodigoBarras && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Para quem foi solicitado?"
                  value={formData.paraQuemSolicitou}
                  onChange={(e) => handleInputChange('paraQuemSolicitou', e.target.value)}
                  required
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.dadosLoteCadastradosSantri}
                    onChange={(e) => handleInputChange('dadosLoteCadastradosSantri', e.target.checked)}
                  />
                }
                label="Os dados do Número do Lote foram cadastrados no SANTRI?"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Condições das embalagens e produtos</InputLabel>
                <Select
                  value={formData.condicaoEmbalagens}
                  onChange={(e) => handleInputChange('condicaoEmbalagens', e.target.value)}
                  label="Condições das embalagens e produtos"
                >
                  <MenuItem value="OTIMA">Ótima</MenuItem>
                  <MenuItem value="BOA">Boa</MenuItem>
                  <MenuItem value="RUIM">Ruim</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Ressalvas e Devoluções
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.houveRessalva}
                    onChange={(e) => handleInputChange('houveRessalva', e.target.checked)}
                  />
                }
                label="Houve Ressalva?"
              />
            </Grid>

            {formData.houveRessalva && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descrição da Ressalva"
                    value={formData.descricaoRessalva}
                    onChange={(e) => handleInputChange('descricaoRessalva', e.target.value)}
                    multiline
                    rows={3}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Para quem foi informada a Ressalva?"
                    value={formData.paraQuemInformouRessalva}
                    onChange={(e) => handleInputChange('paraQuemInformouRessalva', e.target.value)}
                    required
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.houveDevolucao}
                    onChange={(e) => handleInputChange('houveDevolucao', e.target.checked)}
                  />
                }
                label="Houve devolução de Itens?"
              />
            </Grid>

            {formData.houveDevolucao && (
              <>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Quais foram os itens devolvidos?"
                    value={formData.itensDevolvidos}
                    onChange={(e) => handleInputChange('itensDevolvidos', e.target.value)}
                    multiline
                    rows={2}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Quantidade devolvida"
                    type="number"
                    value={formData.quantidadeDevolvida}
                    onChange={(e) => handleInputChange('quantidadeDevolvida', parseInt(e.target.value) || 0)}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.fotoTiradaDevolucao}
                        onChange={(e) => handleInputChange('fotoTiradaDevolucao', e.target.checked)}
                      />
                    }
                    label="Foi tirada foto da devolução?"
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.notaDevolucaoEmitida}
                        onChange={(e) => handleInputChange('notaDevolucaoEmitida', e.target.checked)}
                      />
                    }
                    label="Foi emitida nota de devolução?"
                  />
                </Grid>
                {formData.notaDevolucaoEmitida && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Número da nota de devolução"
                      value={formData.numeroNotaDevolucao}
                      onChange={(e) => handleInputChange('numeroNotaDevolucao', e.target.value)}
                      required
                    />
                  </Grid>
                )}
              </>
            )}
          </Grid>
        );

      case 4:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Checklist Pronto para Finalização
                </Typography>
                <Typography>
                  Revise todas as informações antes de salvar. Após salvar, o checklist será registrado no sistema.
                </Typography>
              </Alert>
            </Grid>
            
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Resumo do Checklist
                </Typography>
                <Typography><strong>Conferente:</strong> {formData.nomeConferente}</Typography>
                <Typography><strong>Fabricante:</strong> {formData.nomeFabricante}</Typography>
                <Typography><strong>Produto:</strong> {formData.descricaoProduto}</Typography>
                <Typography><strong>Lote:</strong> {formData.numeroLote}</Typography>
                <Typography><strong>Vencimento:</strong> {formData.dataVencimento}</Typography>
                <Typography><strong>Condição:</strong> {formData.condicaoEmbalagens}</Typography>
                <Typography><strong>Pocket:</strong> {formData.recebimentoPocket ? 'Sim' : 'Não'}</Typography>
                <Typography><strong>Ressalva:</strong> {formData.houveRessalva ? 'Sim' : 'Não'}</Typography>
                <Typography><strong>Devolução:</strong> {formData.houveDevolucao ? 'Sim' : 'Não'}</Typography>
              </Paper>
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Cabeçalho */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <AssignmentIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              Checklist de Recebimento
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Produtos com Vencimento
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Conteúdo do step */}
          <Box sx={{ mb: 4 }}>
            {renderStepContent(activeStep)}
          </Box>

          {/* Botões de navegação */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              variant="outlined"
            >
              Voltar
            </Button>

            <Box>
              {activeStep === steps.length - 1 ? (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                  size="large"
                >
                  {saving ? 'Salvando...' : 'Finalizar Checklist'}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  size="large"
                >
                  Próximo
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ProtectedRoute>
  );
};

export default ChecklistRecebimentoPage;
