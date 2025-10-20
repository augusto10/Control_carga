import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import Layout from '@/components/Layout';
import { useSnackbar } from 'notistack';
import api from '@/lib/api';

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
  const { enqueueSnackbar } = useSnackbar();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [materialEditando, setMaterialEditando] = useState<Material | null>(null);
  const [valorTexto, setValorTexto] = useState('');
  const [dialogEstoqueAberto, setDialogEstoqueAberto] = useState(false);
  const [materialParaEstoque, setMaterialParaEstoque] = useState<Material | null>(null);
  const [quantidadeAdicionar, setQuantidadeAdicionar] = useState<number>(0);
  const [observacaoEntrada, setObservacaoEntrada] = useState('');
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
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InventoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Cadastro de Materiais
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleAbrirDialog()}
            disabled={loading}
          >
            Novo Material
          </Button>
        </Box>

        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Nome</strong></TableCell>
                    <TableCell><strong>Descrição</strong></TableCell>
                    <TableCell align="center"><strong>Unidade</strong></TableCell>
                    <TableCell align="center"><strong>Valor</strong></TableCell>
                    <TableCell align="center"><strong>Estoque</strong></TableCell>
                    <TableCell align="center"><strong>Mínimo</strong></TableCell>
                    <TableCell align="center"><strong>Status</strong></TableCell>
                    <TableCell align="center"><strong>Ações</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materiais.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        <Typography color="textSecondary">
                          Nenhum material cadastrado
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    materiais.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell>{material.nome}</TableCell>
                        <TableCell>{material.descricao || '-'}</TableCell>
                        <TableCell align="center">{material.unidadeMedida}</TableCell>
                        <TableCell align="center">
                          {material.valor && material.valor > 0 ? `R$ ${material.valor.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell 
                          align="center"
                          sx={{ 
                            color: material.quantidadeEstoque <= material.estoqueMinimo ? 'error.main' : 'inherit',
                            fontWeight: material.quantidadeEstoque <= material.estoqueMinimo ? 'bold' : 'normal'
                          }}
                        >
                          {material.quantidadeEstoque}
                        </TableCell>
                        <TableCell align="center">{material.estoqueMinimo}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={material.ativo ? 'Ativo' : 'Inativo'}
                            color={material.ativo ? 'success' : 'default'}
                            size="small"
                            onClick={() => handleToggleAtivo(material)}
                            sx={{ cursor: 'pointer' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleAbrirDialogEstoque(material)}
                            sx={{ mr: 1 }}
                            disabled={loading}
                          >
                            Adicionar Estoque
                          </Button>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleAbrirDialog(material)}
                            disabled={loading}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleExcluir(material)}
                            disabled={loading}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {materiais.some(m => m.quantidadeEstoque <= m.estoqueMinimo) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                <strong>Atenção!</strong> Alguns materiais estão com estoque abaixo do mínimo.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={dialogAberto} onClose={handleFecharDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {materialEditando ? 'Editar Material' : 'Novo Material'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nome *"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição"
                  multiline
                  rows={2}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Unidade *"
                  value={formData.unidadeMedida}
                  onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                >
                  {unidadesMedida.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Valor Unitário (R$)"
                  value={valorTexto}
                  onChange={(e) => {
                    const value = e.target.value;
                    
                    // Permite apenas números, vírgula e ponto
                    const regex = /^[0-9.,]*$/;
                    
                    if (regex.test(value) || value === '') {
                      setValorTexto(value);
                      
                      // Se estiver vazio, define valor como 0
                      if (value === '') {
                        setFormData({ ...formData, valor: 0 });
                        return;
                      }
                      
                      // Converte para número (substitui vírgula por ponto)
                      const normalized = value.replace(',', '.');
                      const numericValue = parseFloat(normalized);
                      
                      // Atualiza o valor numérico se for válido
                      if (!isNaN(numericValue) && isFinite(numericValue)) {
                        setFormData({ ...formData, valor: numericValue });
                      }
                    }
                  }}
                  placeholder="0,00"
                  helperText="Digite o valor em reais (ex: 25,50 ou 25.50)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estoque Atual"
                  value={formData.quantidadeEstoque}
                  onChange={(e) => setFormData({ ...formData, quantidadeEstoque: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estoque Mínimo"
                  value={formData.estoqueMinimo}
                  onChange={(e) => setFormData({ ...formData, estoqueMinimo: parseInt(e.target.value) || 0 })}
                  inputProps={{ min: 0 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFecharDialog} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} variant="contained" disabled={loading}>
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Adicionar Estoque */}
        <Dialog open={dialogEstoqueAberto} onClose={handleFecharDialogEstoque} maxWidth="xs" fullWidth>
          <DialogTitle>Adicionar Estoque</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Material"
                  value={materialParaEstoque?.nome || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Quantidade a adicionar"
                  value={quantidadeAdicionar}
                  onChange={(e) => setQuantidadeAdicionar(parseInt(e.target.value) || 0)}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observação"
                  multiline
                  rows={2}
                  value={observacaoEntrada}
                  onChange={(e) => setObservacaoEntrada(e.target.value)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleFecharDialogEstoque} disabled={loading}>Cancelar</Button>
            <Button onClick={handleAdicionarEstoque} variant="contained" disabled={loading}>Adicionar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}
