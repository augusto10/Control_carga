import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  MenuItem,
  Alert,
  Stack,
  alpha,
  Tooltip,
  CircularProgress,
  Avatar,
  Container,
  useTheme,
  TablePagination
} from '@mui/material';
import Box from '@mui/material/Box';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { useSnackbar } from 'notistack';
import api from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

interface Material {
  id: string;
  nome: string;
  descricao?: string;
  unidadeMedida: string;
  quantidadeEstoque: number;
  estoqueMinimo: number;
  valor?: number;
  ativo: boolean;
}

const unidadesMedida = [
  { value: 'UN', label: 'Unidade' },
  { value: 'CX', label: 'Caixa' },
  { value: 'PCT', label: 'Pacote' },
  { value: 'RL', label: 'Rolo' },
  { value: 'KG', label: 'Quilograma' },
  { value: 'L', label: 'Litro' },
  { value: 'M', label: 'Metro' }
];

export default function CadastroMateriais() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [materialEditando, setMaterialEditando] = useState<Material | null>(null);
  const [valorTexto, setValorTexto] = useState('');
  const [dialogEstoqueAberto, setDialogEstoqueAberto] = useState(false);
  const [materialParaEstoque, setMaterialParaEstoque] = useState<Material | null>(null);
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState<number>(0);
  const [observacaoEntrada, setObservacaoEntrada] = useState('');
  
  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    unidadeMedida: 'UN',
    quantidadeEstoque: 0,
    estoqueMinimo: 0,
    valor: 0
  });

  useEffect(() => {
    carregarMateriais();
  }, []);

  const carregarMateriais = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/materiais');
      setMateriais(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao carregar materiais', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const materiaisFiltrados = materiais.filter(m => 
    m.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (m.descricao || '').toLowerCase().includes(busca.toLowerCase())
  );

  const handleAbrirDialog = (material?: Material) => {
    if (material) {
      setMaterialEditando(material);
      setFormData({
        nome: material.nome,
        descricao: material.descricao || '',
        unidadeMedida: material.unidadeMedida,
        quantidadeEstoque: material.quantidadeEstoque,
        estoqueMinimo: material.estoqueMinimo,
        valor: material.valor || 0
      });
      setValorTexto(material.valor ? material.valor.toString().replace('.', ',') : '');
    } else {
      setMaterialEditando(null);
      setFormData({
        nome: '',
        descricao: '',
        unidadeMedida: 'UN',
        quantidadeEstoque: 0,
        estoqueMinimo: 0,
        valor: 0
      });
      setValorTexto('');
    }
    setDialogAberto(true);
  };

  const handleFecharDialog = () => {
    setDialogAberto(false);
    setMaterialEditando(null);
  };

  const handleAbrirDialogEstoque = (material: Material) => {
    setMaterialParaEstoque(material);
    setQuantidadeAdicionar(0);
    setObservacaoEntrada('');
    setDialogEstoqueAberto(true);
  };

  const handleFecharDialogEstoque = () => {
    setDialogEstoqueAberto(false);
    setMaterialParaEstoque(null);
  };

  const handleAdicionarEstoque = async () => {
    if (!materialParaEstoque) return;
    if (!quantidadeAdicionar || quantidadeAdicionar <= 0) {
      enqueueSnackbar('Informe uma quantidade válida', { variant: 'warning' });
      return;
    }
    try {
      setLoading(true);
      await api.post(`/api/materiais/${materialParaEstoque.id}/estoque`, {
        quantidade: quantidadeAdicionar,
        observacao: observacaoEntrada
      });
      enqueueSnackbar('Estoque adicionado com sucesso!', { variant: 'success' });
      handleFecharDialogEstoque();
      carregarMateriais();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao adicionar estoque', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    try {
      if (!formData.nome) {
        enqueueSnackbar('Nome é obrigatório', { variant: 'warning' });
        return;
      }

      setLoading(true);

      if (materialEditando) {
        await api.put(`/api/materiais/${materialEditando.id}`, formData);
        enqueueSnackbar('Material atualizado com sucesso!', { variant: 'success' });
      } else {
        await api.post('/api/materiais', formData);
        enqueueSnackbar('Material cadastrado com sucesso!', { variant: 'success' });
      }

      handleFecharDialog();
      carregarMateriais();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao salvar material', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAtivo = async (material: Material) => {
    try {
      setLoading(true);
      await api.put(`/api/materiais/${material.id}`, {
        ativo: !material.ativo
      });
      enqueueSnackbar(`Material ${material.ativo ? 'desativado' : 'ativado'} com sucesso!`, { variant: 'success' });
      carregarMateriais();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao atualizar material', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (material: Material) => {
    if (!confirm(`Deseja realmente excluir o material "${material.nome}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/api/materiais/${material.id}`);
      enqueueSnackbar('Material excluído com sucesso!', { variant: 'success' });
      carregarMateriais();
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao excluir material', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Materiais', href: '/materiais' },
          { label: 'Cadastro' }
        ]}
      >
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{ mb: 4 }}
        >
          <Stack 
            direction={{ xs: 'column', md: 'row' }} 
            justifyContent="space-between" 
            alignItems={{ xs: 'flex-start', md: 'center' }}
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ 
                bgcolor: theme.palette.primary.main, 
                width: 56, 
                height: 56, 
                boxShadow: theme.shadows[4],
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
              }}>
                <InventoryIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="800" color={theme.palette.text.primary} sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                  Gestão de Materiais
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  Cadastre e gerencie o estoque de materiais e EPIs
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleAbrirDialog()}
              sx={{ 
                borderRadius: '12px', 
                px: 3, 
                py: 1,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: theme.shadows[4]
              }}
            >
              Novo Material
            </Button>
          </Stack>
        </MotionBox>

        <MotionPaper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            mb: 3,
            borderRadius: '24px',
            border: '1px solid',
            borderColor: alpha(theme.palette.grey[200], 0.6),
            bgcolor: alpha(theme.palette.background.paper, 0.8),
            backdropFilter: 'blur(10px)',
            boxShadow: theme.shadows[1]
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
            <TextField
              fullWidth
              placeholder="Buscar materiais por nome ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                sx: { borderRadius: '12px', bgcolor: theme.palette.background.paper }
              }}
            />
            <Tooltip title="Atualizar lista">
              <IconButton 
                onClick={carregarMateriais} 
                disabled={loading}
                sx={{ 
                  bgcolor: 'white', 
                  borderRadius: '12px',
                  border: '1px solid',
                  borderColor: theme.palette.grey[200],
                  width: { xs: '100%', sm: 56 },
                  height: 56
                }}
              >
                <RefreshIcon className={loading ? 'spin-animation' : ''} />
              </IconButton>
            </Tooltip>
          </Stack>

          <TableContainer sx={{ borderRadius: '16px', border: '1px solid', borderColor: alpha(theme.palette.grey[200], 0.6), overflow: 'hidden' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.grey[50], 0.8) }}>
                  <TableCell sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>Material</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>Unidade</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>Valor</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>Estoque</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>Mínimo</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.text.secondary }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && materiais.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <CircularProgress size={40} thickness={4} />
                      <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
                        Carregando materiais...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : materiaisFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <InventoryIcon sx={{ fontSize: 48, color: alpha(theme.palette.grey[400], 0.2), mb: 2 }} />
                      <Typography variant="h6" fontWeight="600" color="text.secondary">
                        Nenhum material encontrado
                      </Typography>
                      <Typography variant="body2" color="text.disabled">
                        {busca ? 'Tente mudar o termo da busca.' : 'Cadastre seu primeiro material no botão acima.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {materiaisFiltrados
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((material, index) => (
                        <MotionTableRow
                          key={material.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: index * 0.03 }}
                          hover
                          sx={{ '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) } }}
                        >
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="700" color={theme.palette.text.primary}>
                                {material.nome}
                              </Typography>
                              {material.descricao && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 200 }} noWrap>
                                  {material.descricao}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={material.unidadeMedida} 
                              size="small" 
                              sx={{ fontWeight: 700, borderRadius: '6px', bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, color: '#475569' }}>
                            {material.valor && material.valor > 0 ? `R$ ${material.valor.toFixed(2).replace('.', ',')}` : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                              <Typography 
                                fontWeight="800"
                                color={material.quantidadeEstoque <= material.estoqueMinimo ? 'error.main' : 'success.main'}
                              >
                                {material.quantidadeEstoque}
                              </Typography>
                              {material.quantidadeEstoque <= material.estoqueMinimo && (
                                <Tooltip title="Estoque baixo!">
                                  <WarningIcon sx={{ color: 'error.main', fontSize: 16 }} />
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 600, color: '#64748b' }}>
                            {material.estoqueMinimo}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={material.ativo ? 'Ativo' : 'Inativo'}
                              color={material.ativo ? 'success' : 'default'}
                              size="small"
                              onClick={() => handleToggleAtivo(material)}
                              sx={{ 
                                cursor: 'pointer', 
                                fontWeight: 700, 
                                borderRadius: '8px',
                                '&:hover': { opacity: 0.8 }
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="Adicionar Estoque">
                                <IconButton
                                  size="small"
                                  onClick={() => handleAbrirDialogEstoque(material)}
                                  sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main' }}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Editar">
                                <IconButton
                                  size="small"
                                  onClick={() => handleAbrirDialog(material)}
                                  sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Excluir">
                                <IconButton
                                  size="small"
                                  onClick={() => handleExcluir(material)}
                                  sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), color: 'error.main' }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </MotionTableRow>
                      ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={materiaisFiltrados.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Linhas por página"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </MotionPaper>

        {materiais.some(m => m.quantidadeEstoque <= m.estoqueMinimo) && (
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert 
              severity="warning" 
              variant="standard"
              icon={<WarningIcon sx={{ color: theme.palette.warning.main }} />}
              sx={{ 
                borderRadius: '16px',
                backdropFilter: 'blur(12px)',
                backgroundColor: alpha(theme.palette.warning.main, 0.15),
                color: theme.palette.warning.dark,
                border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.warning.main,
                },
                '& .MuiAlert-message': {
                  width: '100%',
                  fontWeight: 600,
                },
                boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
              }}
            >
              <strong>Atenção!</strong> Existem itens com estoque abaixo do limite mínimo definido.
            </Alert>
          </MotionBox>
        )}
        <Dialog 
          open={dialogAberto} 
          onClose={handleFecharDialog} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: '24px', p: 1 }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#1e293b', pb: 1 }}>
            {materialEditando ? 'Editar Material' : 'Novo Material'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome do Material"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição / Detalhes"
                  multiline
                  rows={2}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Unidade de Medida"
                  required
                  value={formData.unidadeMedida}
                  onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                >
                  {unidadesMedida.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Valor Unitário (R$)"
                  value={valorTexto}
                  onChange={(e) => {
                    const value = e.target.value;
                    const regex = /^[0-9.,]*$/;
                    if (regex.test(value) || value === '') {
                      setValorTexto(value);
                      if (value === '') {
                        setFormData({ ...formData, valor: 0 });
                        return;
                      }
                      const normalized = value.replace(',', '.');
                      const numericValue = parseFloat(normalized);
                      if (!isNaN(numericValue) && isFinite(numericValue)) {
                        setFormData({ ...formData, valor: numericValue });
                      }
                    }
                  }}
                  placeholder="0,00"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estoque Inicial"
                  value={formData.quantidadeEstoque}
                  onChange={(e) => setFormData({ ...formData, quantidadeEstoque: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estoque Mínimo"
                  value={formData.estoqueMinimo}
                  onChange={(e) => setFormData({ ...formData, estoqueMinimo: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleFecharDialog} 
              sx={{ borderRadius: '10px', fontWeight: 600, color: 'text.secondary' }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvar} 
              variant="contained" 
              disabled={loading}
              startIcon={<SaveIcon />}
              sx={{ 
                borderRadius: '10px', 
                px: 3, 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              Salvar Material
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Adicionar Estoque */}
        <Dialog 
          open={dialogEstoqueAberto} 
          onClose={handleFecharDialogEstoque} 
          maxWidth="xs" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: '24px', p: 1 }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#1e293b', pb: 1 }}>
            Adicionar Estoque
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="primary.main" fontWeight="700" gutterBottom>
                {materialParaEstoque?.nome}
              </Typography>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Quantidade a Adicionar"
                    autoFocus
                    value={quantidadeAdicionar}
                    onChange={(e) => setQuantidadeAdicionar(parseInt(e.target.value) || 0)}
                    inputProps={{ min: 1 }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Observação / Motivo"
                    multiline
                    rows={2}
                    value={observacaoEntrada}
                    onChange={(e) => setObservacaoEntrada(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button 
              onClick={handleFecharDialogEstoque}
              sx={{ borderRadius: '10px', fontWeight: 600, color: 'text.secondary' }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAdicionarEstoque} 
              variant="contained" 
              disabled={loading}
              startIcon={<AddIcon />}
              sx={{ 
                borderRadius: '10px', 
                px: 3, 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              Confirmar Entrada
            </Button>
          </DialogActions>
        </Dialog>

        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin-animation {
            animation: spin 1s linear infinite;
          }
        `}</style>
      </ResponsiveContainer>
    </ProtectedRoute>
  );
}
