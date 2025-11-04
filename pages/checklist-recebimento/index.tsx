import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
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
  Snackbar,
  Card,
  CardContent,
  IconButton,
  Divider,
  Chip
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
import AndroidScanner from '../../components/AndroidScanner';
import AndroidCamera from '../../components/AndroidCamera';

// Declaração global para scanner Android
declare global {
  interface Window {
    Android?: {
      scanBarcode: (callback: (result: string) => void) => void;
      isAvailable: () => boolean;
    };
  }
}

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
  fotoProduto: File | null; // Foto individual do produto
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
  
  // Novos campos para alertas de validade
  alertaValidadeAutorizado: boolean;
  nomeAutorizadorLider: string;
  produtosComAlertaValidade: string[];
}

const steps = [
  'Dados Básicos e Produtos',
  'Códigos de Barras',
  'Fotos',
  'Checklist',
  'Finalização'
];

function ChecklistRecebimentoPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'warning' });
  const router = useRouter();
  const { user } = useAuth();
  
  // Refs para captura de fotos e códigos
  const fotoRecebimentoRef = useRef<HTMLInputElement>(null);
  const fotoDevolucaoRef = useRef<HTMLInputElement>(null);
  const codigoBarrasRef = useRef<HTMLInputElement>(null);

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
      codigoBarrasItem: '',
      fotoProduto: null
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
    numeroNotaDevolucao: '',
    
    // Novos campos
    alertaValidadeAutorizado: false,
    nomeAutorizadorLider: '',
    produtosComAlertaValidade: []
  });

  // Funções para gerenciar produtos
  const adicionarProduto = () => {
    const novoProduto: Produto = {
      id: Date.now().toString(),
      nomeFabricante: '',
      descricaoProduto: '',
      numeroLote: '',
      dataFabricacao: '',
      dataVencimento: '',
      admProduto: '',
      codigoBarrasCaixaMaster: '',
      codigoBarrasCaixaInterna: '',
      codigoBarrasItem: '',
      fotoProduto: null
    };
    
    setFormData(prev => ({
      ...prev,
      produtos: [...prev.produtos, novoProduto]
    }));
  };

  const removerProduto = (id: string) => {
    if (formData.produtos.length > 1) {
      setFormData(prev => ({
        ...prev,
        produtos: prev.produtos.filter(p => p.id !== id)
      }));
    }
  };

  const atualizarProduto = (id: string, campo: keyof Produto, valor: string) => {
    setFormData(prev => ({
      ...prev,
      produtos: prev.produtos.map(p => 
        p.id === id ? { ...p, [campo]: valor } : p
      )
    }));
    
    // Se for data de vencimento, validar automaticamente
    if (campo === 'dataVencimento' && valor) {
      setTimeout(() => {
        const produtosComProblema = validarValidadeProdutos();
        if (produtosComProblema.length > 0) {
          // Em mobile, usar um Alert mais amigável
          const mensagem = `⚠️ ALERTA DE VALIDADE\n\nOs seguintes produtos estão com validade inferior a 8 meses:\n\n${produtosComProblema.join('\n')}\n\nDeseja prosseguir?`;
          
          // Em mobile, garantir que o prompt seja visível e usável
          if (window.confirm(mensagem)) {
            let nomeAutorizador;
            do {
              nomeAutorizador = prompt('👥 Digite o nome do líder que autorizou prosseguir:');
            } while (nomeAutorizador !== null && nomeAutorizador.trim() === '');

            if (nomeAutorizador) {
              setFormData(prev => ({
                ...prev,
                alertaValidadeAutorizado: true,
                nomeAutorizadorLider: nomeAutorizador.trim(),
                produtosComAlertaValidade: produtosComProblema
              }));
              
              // Feedback mais visível em mobile
              setSnackbar({ 
                open: true, 
                message: `⚠️ Alerta de validade registrado.\nAutorizado por: ${nomeAutorizador.trim()}`, 
                severity: 'warning' 
              });
            }
          } else {
            // Se não autorizado, limpar a data
            atualizarProduto(id, campo, '');
            setSnackbar({
              open: true,
              message: '❌ Produto com validade inferior a 8 meses não autorizado',
              severity: 'error'
            });
          }
        }
      }, 250); // Aumentado para dar tempo do teclado virtual fechar em mobile
    }
  };

  // Função para capturar foto geral
  const capturarFoto = (tipo: 'recebimento' | 'devolucao') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Usar câmera traseira
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setFormData(prev => ({
          ...prev,
          [tipo === 'recebimento' ? 'fotoRecebimento' : 'fotoDevolucao']: file
        }));
      }
    };
    
    input.click();
  };

  // Função para capturar foto individual do produto
  const capturarFotoProduto = (produtoId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Usar câmera traseira
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setFormData(prev => ({
          ...prev,
          produtos: prev.produtos.map(p => 
            p.id === produtoId ? { ...p, fotoProduto: file } : p
          )
        }));
      }
    };
    
    input.click();
  };

  // Função para validar validade dos produtos (8 meses)
  const validarValidadeProdutos = () => {
    const produtosComProblema: string[] = [];
    const hoje = new Date();
    const oitoMesesEmMs = 8 * 30 * 24 * 60 * 60 * 1000; // 8 meses em millisegundos
    
    formData.produtos.forEach(produto => {
      if (produto.dataVencimento) {
        const dataVencimento = new Date(produto.dataVencimento);
        const diferencaMs = dataVencimento.getTime() - hoje.getTime();
        console.log('📅 [Checklist] Validando validade:', {
          produto: produto.descricaoProduto,
          vencimento: produto.dataVencimento,
          diferencaMeses: Math.floor(diferencaMs / (30 * 24 * 60 * 60 * 1000))
        });
        
        // Se a diferença for menor que 8 meses
        if (diferencaMs < oitoMesesEmMs && diferencaMs > 0) {
          const mesesRestantes = Math.floor(diferencaMs / (30 * 24 * 60 * 60 * 1000));
          const mensagem = `${produto.descricaoProduto || 'Produto'} (${mesesRestantes} meses restantes)`;
          produtosComProblema.push(mensagem);
          console.log('⚠️ [Checklist] Produto com validade próxima:', mensagem);
        } else if (diferencaMs <= 0) {
          const mensagem = `${produto.descricaoProduto || 'Produto'} (VENCIDO)`;
          produtosComProblema.push(mensagem);
          console.log('❌ [Checklist] Produto vencido:', mensagem);
        }
      }
    });
    
    if (produtosComProblema.length > 0) {
      console.log('🚨 [Checklist] Produtos com problemas de validade:', produtosComProblema);
    }
    
    return produtosComProblema;
  };

  // Função para mostrar alerta de validade
  const mostrarAlertaValidade = (produtosComProblema: string[]) => {
    const mensagem = `⚠️ ALERTA DE VALIDADE \n\nOs seguintes produtos estão com validade inferior a 8 meses:\n\n${produtosComProblema.join('\n')}\n\nDeseja prosseguir? Será necessária autorização do líder do setor.`;
    
    return window.confirm(mensagem);
  };

  // Função para escanear código de barras (otimizada para Movfast Ranger2)
  const escanearCodigoBarras = (produtoId: string, campo: keyof Produto) => {
    // Verificar se é dispositivo Android com scanner integrado
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isMovfast = /Movfast|Ranger/i.test(navigator.userAgent) || window.location.hostname.includes('movfast');
    
    if (isAndroid || isMovfast) {
      // Tentar usar scanner nativo do dispositivo
      try {
        // Para dispositivos Movfast Ranger2 com scanner integrado
        if (window.Android && window.Android.scanBarcode) {
          window.Android.scanBarcode((result: string) => {
            if (result && result !== 'cancelled') {
              atualizarProduto(produtoId, campo, result);
              setSnackbar({ open: true, message: 'Código escaneado com sucesso!', severity: 'success' });
            }
          });
          return;
        }
        
        // Fallback: usar câmera para capturar imagem do código
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            // Simular processamento de código de barras
            const codigo = prompt('Scanner ativado! Digite o código lido ou confirme:');
            if (codigo) {
              atualizarProduto(produtoId, campo, codigo);
              setSnackbar({ open: true, message: 'Código registrado com sucesso!', severity: 'success' });
            }
          }
        };
        
        input.click();
      } catch (error) {
        console.error('Erro ao acessar scanner:', error);
        // Fallback para entrada manual
        const codigo = prompt('Digite o código de barras manualmente:');
        if (codigo) {
          atualizarProduto(produtoId, campo, codigo);
        }
      }
    } else {
      // Para outros dispositivos - entrada manual
      const codigo = prompt('Digite o código de barras:');
      if (codigo) {
        atualizarProduto(produtoId, campo, codigo);
      }
    }
  };


  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    
    try {
      console.log('📋 [Frontend] Iniciando salvamento do checklist');
      console.log('📋 [Frontend] Dados do formulário:', {
        produtos: formData.produtos.length,
        alertaValidadeAutorizado: formData.alertaValidadeAutorizado,
        nomeAutorizadorLider: formData.nomeAutorizadorLider,
        produtosComAlertaValidade: formData.produtosComAlertaValidade.length
      });
      
      const checklistData = new FormData();
      
      // Dados básicos
      checklistData.append('dataRecebimento', formData.dataRecebimento);
      checklistData.append('horarioRecebimento', formData.horarioRecebimento);
      checklistData.append('nomeConferente', formData.nomeConferente);
      
      // Produtos (como JSON)
      checklistData.append('produtos', JSON.stringify(formData.produtos));
      
      // Fotos gerais
      if (formData.fotoRecebimento) {
        checklistData.append('fotoRecebimento', formData.fotoRecebimento);
      }
      if (formData.fotoDevolucao) {
        checklistData.append('fotoDevolucao', formData.fotoDevolucao);
      }
      
      // Fotos dos produtos
      formData.produtos.forEach((produto, index) => {
        if (produto.fotoProduto) {
          // Usar o ID do produto no nome do campo para garantir consistência
          const fieldName = `fotoProduto_${produto.id}`;
          checklistData.append(fieldName, produto.fotoProduto);
          console.log(`📸 [Frontend] Adicionando foto do produto:`, {
            id: produto.id,
            fieldName,
            fileName: produto.fotoProduto.name,
            size: produto.fotoProduto.size
          });
        }
      });
      
      // Perguntas do checklist e alertas
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'produtos' && key !== 'fotoRecebimento' && key !== 'fotoDevolucao') {
          if (key === 'produtosComAlertaValidade') {
            // Garantir que array seja enviado como JSON string
            checklistData.append(key, JSON.stringify(value));
            console.log('⚠️ [Frontend] Enviando produtos com alerta:', value);
          } else {
            checklistData.append(key, value.toString());
          }
        }
      });

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
      
      setTimeout(() => {
        router.push('/checklist-recebimento/relatorios');
      }, 2000);

    } catch (error) {
      console.error('Erro ao salvar checklist:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao salvar checklist';
      setSnackbar({ 
        open: true, 
        message: `Erro ao salvar: ${errorMessage}`, 
        severity: 'error' 
      });
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
                onChange={(e) => setFormData(prev => ({ ...prev, dataRecebimento: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, horarioRecebimento: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome do Conferente"
                value={formData.nomeConferente}
                onChange={(e) => setFormData(prev => ({ ...prev, nomeConferente: e.target.value }))}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Produtos Recebidos</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={adicionarProduto}
                  variant="outlined"
                  color="primary"
                >
                  Adicionar Produto
                </Button>
              </Box>
              
              {formData.produtos.map((produto, index) => (
                <Card key={produto.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="subtitle1">
                        Produto {index + 1}
                      </Typography>
                      {formData.produtos.length > 1 && (
                        <IconButton
                          onClick={() => removerProduto(produto.id)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Nome do Fabricante"
                          value={produto.nomeFabricante}
                          onChange={(e) => atualizarProduto(produto.id, 'nomeFabricante', e.target.value)}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Descrição do Produto"
                          value={produto.descricaoProduto}
                          onChange={(e) => atualizarProduto(produto.id, 'descricaoProduto', e.target.value)}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Número do Lote"
                          value={produto.numeroLote}
                          onChange={(e) => atualizarProduto(produto.id, 'numeroLote', e.target.value)}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Data de Fabricação"
                          type="date"
                          value={produto.dataFabricacao}
                          onChange={(e) => atualizarProduto(produto.id, 'dataFabricacao', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          required
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Data de Vencimento"
                          type="date"
                          value={produto.dataVencimento}
                          onChange={(e) => atualizarProduto(produto.id, 'dataVencimento', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          required
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Códigos de Barras dos Produtos
              </Typography>
            </Grid>
            
            {formData.produtos.map((produto, index) => (
              <Grid item xs={12} key={produto.id}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {produto.descricaoProduto || `Produto ${index + 1}`}
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box display="flex" gap={1}>
                          <TextField
                            fullWidth
                            label="ADM do Produto"
                            value={produto.admProduto}
                            onChange={(e) => atualizarProduto(produto.id, 'admProduto', e.target.value)}
                          />
                          <AndroidScanner
                            onScan={(codigo) => atualizarProduto(produto.id, 'admProduto', codigo)}
                            onError={(error) => setSnackbar({ open: true, message: error, severity: 'error' })}
                            buttonText="Scanner"
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box display="flex" gap={1}>
                          <TextField
                            fullWidth
                            label="Código Caixa Master"
                            value={produto.codigoBarrasCaixaMaster}
                            onChange={(e) => atualizarProduto(produto.id, 'codigoBarrasCaixaMaster', e.target.value)}
                          />
                          <AndroidScanner
                            onScan={(codigo) => atualizarProduto(produto.id, 'codigoBarrasCaixaMaster', codigo)}
                            onError={(error) => setSnackbar({ open: true, message: error, severity: 'error' })}
                            buttonText="Scanner"
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box display="flex" gap={1}>
                          <TextField
                            fullWidth
                            label="Código Caixa Interna"
                            value={produto.codigoBarrasCaixaInterna}
                            onChange={(e) => atualizarProduto(produto.id, 'codigoBarrasCaixaInterna', e.target.value)}
                          />
                          <AndroidScanner
                            onScan={(codigo) => atualizarProduto(produto.id, 'codigoBarrasCaixaInterna', codigo)}
                            onError={(error) => setSnackbar({ open: true, message: error, severity: 'error' })}
                            buttonText="Scanner"
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Box display="flex" gap={1}>
                          <TextField
                            fullWidth
                            label="Código do Item"
                            value={produto.codigoBarrasItem}
                            onChange={(e) => atualizarProduto(produto.id, 'codigoBarrasItem', e.target.value)}
                          />
                          <AndroidScanner
                            onScan={(codigo) => atualizarProduto(produto.id, 'codigoBarrasItem', codigo)}
                            onError={(error) => setSnackbar({ open: true, message: error, severity: 'error' })}
                            buttonText="Scanner"
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Fotos do Recebimento
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Foto do Recebimento
                </Typography>
                <AndroidCamera
                  onCapture={(file) => {
                    setFormData(prev => ({ ...prev, fotoRecebimento: file }));
                    setSnackbar({ open: true, message: 'Foto de recebimento capturada!', severity: 'success' });
                  }}
                  onError={(error) => setSnackbar({ open: true, message: error, severity: 'error' })}
                  currentFile={formData.fotoRecebimento}
                  buttonText="Tirar Foto do Recebimento"
                  size="large"
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Foto da Devolução (se houver)
                </Typography>
                <AndroidCamera
                  onCapture={(file) => {
                    setFormData(prev => ({ ...prev, fotoDevolucao: file }));
                    setSnackbar({ open: true, message: 'Foto de devolução capturada!', severity: 'success' });
                  }}
                  onError={(error) => setSnackbar({ open: true, message: error, severity: 'error' })}
                  currentFile={formData.fotoDevolucao}
                  buttonText="Tirar Foto da Devolução"
                  variant="outlined"
                />
              </Paper>
            </Grid>
            
            {/* Fotos individuais dos produtos */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Fotos dos Produtos
              </Typography>
            </Grid>
            
            {formData.produtos.map((produto, index) => (
              <Grid item xs={12} md={6} key={produto.id}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    {produto.descricaoProduto || `Produto ${index + 1}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {produto.nomeFabricante} - Lote: {produto.numeroLote}
                  </Typography>
                  
                  <AndroidCamera
                    onCapture={(file) => {
                      setFormData(prev => ({
                        ...prev,
                        produtos: prev.produtos.map(p => 
                          p.id === produto.id ? { ...p, fotoProduto: file } : p
                        )
                      }));
                      setSnackbar({ open: true, message: 'Foto capturada com sucesso!', severity: 'success' });
                    }}
                    onError={(error) => setSnackbar({ open: true, message: error, severity: 'error' })}
                    currentFile={produto.fotoProduto}
                    buttonText="Tirar Foto do Produto"
                    size="large"
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Perguntas do Checklist
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.recebimentoPocket}
                    onChange={(e) => setFormData(prev => ({ ...prev, recebimentoPocket: e.target.checked }))}
                  />
                }
                label="O Recebimento foi realizado no pocket?"
              />
            </Grid>
            
            {!formData.recebimentoPocket && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Motivo de não usar o pocket"
                  value={formData.motivoNaoPocket}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivoNaoPocket: e.target.value }))}
                  multiline
                  rows={2}
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.possuiCodigoBarras}
                    onChange={(e) => setFormData(prev => ({ ...prev, possuiCodigoBarras: e.target.checked }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, solicitouCadastroCodigoBarras: e.target.checked }))}
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
                  onChange={(e) => setFormData(prev => ({ ...prev, paraQuemSolicitou: e.target.value }))}
                  required
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.dadosLoteCadastradosSantri}
                    onChange={(e) => setFormData(prev => ({ ...prev, dadosLoteCadastradosSantri: e.target.checked }))}
                  />
                }
                label="Os dados do Número do Lote foram cadastrados no SANTRI?"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Condições das embalagens</InputLabel>
                <Select
                  value={formData.condicaoEmbalagens}
                  onChange={(e) => setFormData(prev => ({ ...prev, condicaoEmbalagens: e.target.value as any }))}
                  label="Condições das embalagens"
                >
                  <MenuItem value="OTIMA">Ótima</MenuItem>
                  <MenuItem value="BOA">Boa</MenuItem>
                  <MenuItem value="RUIM">Ruim</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Houve Ressalva?
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant={formData.houveRessalva ? 'contained' : 'outlined'}
                  color={formData.houveRessalva ? 'error' : 'primary'}
                  onClick={() => setFormData(prev => ({ ...prev, houveRessalva: true }))}
                  size="large"
                >
                  SIM
                </Button>
                <Button
                  variant={!formData.houveRessalva ? 'contained' : 'outlined'}
                  color={!formData.houveRessalva ? 'success' : 'primary'}
                  onClick={() => setFormData(prev => ({ ...prev, houveRessalva: false, descricaoRessalva: '', paraQuemInformouRessalva: '' }))}
                  size="large"
                >
                  NÃO
                </Button>
              </Box>
            </Grid>

            {formData.houveRessalva && (
              <>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Descrição da Ressalva"
                    value={formData.descricaoRessalva}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricaoRessalva: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, paraQuemInformouRessalva: e.target.value }))}
                    required
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Houve devolução de Itens?
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant={formData.houveDevolucao ? 'contained' : 'outlined'}
                  color={formData.houveDevolucao ? 'error' : 'primary'}
                  onClick={() => setFormData(prev => ({ ...prev, houveDevolucao: true }))}
                  size="large"
                >
                  SIM
                </Button>
                <Button
                  variant={!formData.houveDevolucao ? 'contained' : 'outlined'}
                  color={!formData.houveDevolucao ? 'success' : 'primary'}
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    houveDevolucao: false, 
                    itensDevolvidos: '', 
                    quantidadeDevolvida: 0, 
                    fotoTiradaDevolucao: false, 
                    notaDevolucaoEmitida: false, 
                    numeroNotaDevolucao: '' 
                  }))}
                  size="large"
                >
                  NÃO
                </Button>
              </Box>
            </Grid>

            {formData.houveDevolucao && (
              <>
                <Grid item xs={12} md={8}>
                  <TextField
                    fullWidth
                    label="Quais foram os itens devolvidos?"
                    value={formData.itensDevolvidos}
                    onChange={(e) => setFormData(prev => ({ ...prev, itensDevolvidos: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, quantidadeDevolvida: parseInt(e.target.value) || 0 }))}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.fotoTiradaDevolucao}
                        onChange={(e) => setFormData(prev => ({ ...prev, fotoTiradaDevolucao: e.target.checked }))}
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
                        onChange={(e) => setFormData(prev => ({ ...prev, notaDevolucaoEmitida: e.target.checked }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, numeroNotaDevolucao: e.target.value }))}
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
              <Alert severity="info">
                <Typography variant="h6" gutterBottom>
                  Resumo do Checklist
                </Typography>
                <Typography>
                  • Data: {formData.dataRecebimento} às {formData.horarioRecebimento}
                </Typography>
                <Typography>
                  • Conferente: {formData.nomeConferente}
                </Typography>
                <Typography>
                  • Produtos: {formData.produtos.length} produto(s)
                </Typography>
                <Typography>
                  • Fotos: {formData.fotoRecebimento ? 'Recebimento ✓' : 'Recebimento ✗'} | {formData.fotoDevolucao ? 'Devolução ✓' : 'Devolução ✗'}
                </Typography>
                <Typography>
                  • Ressalva: {formData.houveRessalva ? 'SIM' : 'NÃO'}
                </Typography>
                <Typography>
                  • Devolução: {formData.houveDevolucao ? 'SIM' : 'NÃO'}
                </Typography>
              </Alert>
            </Grid>
            
            {/* Alerta de validade se houver produtos com problema */}
            {formData.alertaValidadeAutorizado && formData.produtosComAlertaValidade.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    ⚠️ ALERTA DE VALIDADE
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Produtos com validade inferior a 8 meses:</strong>
                  </Typography>
                  {formData.produtosComAlertaValidade.map((produto, index) => (
                    <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                      • {produto}
                    </Typography>
                  ))}
                  <Typography variant="body1" sx={{ mt: 2, fontWeight: 'bold' }}>
                    👥 Autorizado por: {formData.nomeAutorizadorLider}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ressalva registrada conforme autorização do líder do setor.
                  </Typography>
                </Alert>
              </Grid>
            )}
            
            {/* Lista detalhada dos produtos */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Produtos Cadastrados:
              </Typography>
              {formData.produtos.map((produto, index) => (
                <Card key={produto.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      {index + 1}. {produto.descricaoProduto || 'Produto sem descrição'}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                          <strong>Fabricante:</strong> {produto.nomeFabricante || 'Não informado'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Lote:</strong> {produto.numeroLote || 'Não informado'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Typography variant="body2">
                          <strong>Fabricação:</strong> {produto.dataFabricacao || 'Não informado'}
                        </Typography>
                        <Typography variant="body2">
                          <strong>Vencimento:</strong> {produto.dataVencimento || 'Não informado'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          <strong>Foto:</strong> {produto.fotoProduto ? '✓ Capturada' : '✗ Não capturada'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Grid>
          </Grid>
        );

      default:
        return 'Etapa desconhecida';
    }
  };

  const { isMobile } = useDeviceDetect();

  return (
    <ProtectedRoute>
      <Box sx={{ 
        maxWidth: 1200, 
        mx: 'auto', 
        p: isMobile ? 1 : 3,
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}>
        <Paper sx={{ 
          p: isMobile ? 2 : 4,
          borderRadius: isMobile ? '0px' : '8px',
          boxShadow: isMobile ? 'none' : 1
        }}>
          <Box display="flex" alignItems="center" mb={isMobile ? 2 : 4}>
            <AssignmentIcon sx={{ 
              fontSize: isMobile ? 28 : 40, 
              mr: 2, 
              color: 'primary.main' 
            }} />
            <Typography 
              variant={isMobile ? "h5" : "h4"} 
              component="h1"
              sx={{ 
                fontSize: isMobile ? '1.5rem' : undefined,
                fontWeight: 600
              }}
            >
              Checklist de Recebimento
            </Typography>
          </Box>

          {isMobile ? (
            // Versão mobile: mostra apenas o passo atual
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Chip
                label={`${activeStep + 1}/${steps.length}: ${steps[activeStep]}`}
                color="primary"
                sx={{ 
                  fontSize: '1rem',
                  py: 2,
                  width: '100%',
                  borderRadius: 2
                }}
              />
            </Box>
          ) : (
            // Versão desktop: mostra todos os passos
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          )}

          <Box sx={{ mt: 3, mb: 3 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 2 : 1,
            pt: 2,
            position: isMobile ? 'sticky' : 'static',
            bottom: isMobile ? 0 : 'auto',
            left: 0,
            right: 0,
            bgcolor: 'background.paper',
            p: isMobile ? 2 : 0,
            borderTop: isMobile ? 1 : 0,
            borderColor: 'divider',
            mt: isMobile ? 4 : 2,
            mx: isMobile ? -2 : 0
          }}>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                fullWidth={isMobile}
                size={isMobile ? 'large' : 'medium'}
                sx={{ 
                  py: isMobile ? 2 : 1,
                  order: isMobile ? 1 : 2
                }}
              >
                {saving ? 'Salvando...' : 'Finalizar Checklist'}
              </Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleNext}
                fullWidth={isMobile}
                size={isMobile ? 'large' : 'medium'}
                sx={{ 
                  py: isMobile ? 2 : 1,
                  order: isMobile ? 1 : 2
                }}
              >
                Próximo
              </Button>
            )}
            
            <Button
              color="inherit"
              disabled={activeStep === 0}
              onClick={handleBack}
              fullWidth={isMobile}
              size={isMobile ? 'large' : 'medium'}
              variant={isMobile ? 'outlined' : 'text'}
              sx={{ 
                py: isMobile ? 2 : 1,
                order: isMobile ? 2 : 1
              }}
            >
              Voltar
            </Button>
            {!isMobile && <Box sx={{ flex: '1 1 auto' }} />}
          </Box>
        </Paper>

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
}

export default ChecklistRecebimentoPage;
