import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { api } from '@/services/api';
import AdminRoute from '@/components/admin/AdminRoute';
import { Transportadora } from '@prisma/client';

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnh: string;
  transportadoraId: string;
  transportadora?: Transportadora;
}

function MotoristasContent() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);

  const [openDialog, setOpenDialog] = useState(false);
  const [current, setCurrent] = useState<Partial<Motorista> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success'|'error' }>({ open:false, message:'', severity:'success' });

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    setLoading(true);
    try {
      // Sempre tenta carregar transportadoras primeiro, pois são essenciais para o formulário
      const transRes = await api.get<Transportadora[]>('/api/transportadoras');
      setTransportadoras(transRes.data);
    } catch (err) {
      console.error('[Motoristas] Erro ao carregar transportadoras:', err);
      setSnackbar({ open: true, message: 'Erro ao carregar transportadoras', severity: 'error' });
    }

    try {
      // A listagem de motoristas não é obrigatória para criar novos
      const motRes = await api.get<Motorista[]>('/api/motoristas');
      setMotoristas(motRes.data);
    } catch (err) {
      console.error('[Motoristas] Erro ao carregar motoristas:', err);
      setSnackbar({ open: true, message: 'Erro ao carregar motoristas', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNovo = ()=>{
    setCurrent({ nome:'', telefone:'', cpf:'', cnh:'', transportadoraId:'' });
    setIsEditing(false);
    setOpenDialog(true);
  };
  const handleOpenEdit = (m:Motorista)=>{
    setCurrent({ ...m });
    setIsEditing(true);
    setOpenDialog(true);
  };
  const handleCloseDialog = ()=>{ setOpenDialog(false); setCurrent(null); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>)=>{
    const {name,value} = e.target;
    setCurrent(prev => ({ ...prev!, [name]: value }));
  };

  const handleSubmit = async()=>{
    if(!current) return;
    try{
      setLoading(true);
      if(isEditing){
        await api.put(`/api/motoristas/${current.id}`, current);
        setSnackbar({open:true,message:'Motorista atualizado!',severity:'success'});
      }else{
        await api.post('/api/motoristas', current);
        setSnackbar({open:true,message:'Motorista criado!',severity:'success'});
      }
      handleCloseDialog();
      await carregar();
    }catch(err){
      console.error(err);
      setSnackbar({open:true,message:'Erro ao salvar',severity:'error'});
    }finally{setLoading(false);}  
  };

  const handleDelete = async(id:string)=>{
    if(!confirm('Excluir motorista?')) return;
    try{
      await api.delete(`/api/motoristas/${id}`);
      await carregar();
    }catch(err){
      console.error(err);
      setSnackbar({open:true,message:'Erro ao excluir',severity:'error'});
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt:4 }}>
      <Typography variant="h4" gutterBottom>Motoristas</Typography>
      <Paper sx={{ p:2 }}>
        <Button variant="contained" startIcon={<AddIcon/>} onClick={handleOpenNovo}>Novo Motorista</Button>
      </Paper>

      <TableContainer component={Paper} sx={{ mt:2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>CPF</TableCell>
              <TableCell>CNH</TableCell>
              <TableCell>Transportadora</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {motoristas.map(m=> (
              <TableRow key={m.id}>
                <TableCell>{m.nome}</TableCell>
                <TableCell>{m.telefone}</TableCell>
                <TableCell>{m.cpf}</TableCell>
                <TableCell>{m.cnh}</TableCell>
                <TableCell>{m.transportadora?.descricao || m.transportadoraId}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar"><IconButton onClick={()=>handleOpenEdit(m)}><EditIcon/></IconButton></Tooltip>
                  <Tooltip title="Excluir"><IconButton onClick={()=>handleDelete(m.id)} color="error"><DeleteIcon/></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && <CircularProgress sx={{ m:2 }}/>}  
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth>
        <DialogTitle>{isEditing?'Editar':'Novo'} Motorista</DialogTitle>
        <DialogContent>
          <TextField label="Nome" name="nome" value={current?.nome||''} onChange={handleChange} fullWidth margin="normal" required />
          <TextField label="Telefone" name="telefone" value={current?.telefone||''} onChange={handleChange} fullWidth margin="normal" />
          <TextField label="CPF" name="cpf" value={current?.cpf||''} onChange={handleChange} fullWidth margin="normal" required />
          <TextField label="CNH" name="cnh" value={current?.cnh||''} onChange={handleChange} fullWidth margin="normal" required />
          <TextField select label="Transportadora" name="transportadoraId" value={current?.transportadoraId||''} onChange={handleChange} fullWidth margin="normal" required>
            {transportadoras.map(t=> (
              <MenuItem key={t.id} value={t.id}>{t.descricao}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading || !current?.nome || !current?.cpf || !current?.transportadoraId}>{loading?<CircularProgress size={24}/>:'Salvar'}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={()=>setSnackbar({...snackbar,open:false})} anchorOrigin={{vertical:'top',horizontal:'center'}}>
        <Alert severity={snackbar.severity} onClose={()=>setSnackbar({...snackbar,open:false})}>{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}

const MotoristasPage = () => (
  <AdminRoute>
    <MotoristasContent />
  </AdminRoute>
);

export default MotoristasPage;
