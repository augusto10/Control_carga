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
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { api } from '@/services/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

interface TransportadoraApi {
  id: string;
  nome: string;
  descricao: string;
}

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnh: string;
  transportadoraId: string;
  transportadora?: TransportadoraApi;
}

function MotoristasContent() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [transportadoras, setTransportadoras] = useState<TransportadoraApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success'|'error' }>({ open:false, message:'', severity:'success' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; motorista: Motorista | null }>({ open: false, motorista: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(()=>{ carregar(); },[]);

  const carregar = async()=>{
    try{
      setLoading(true);
      const [motRes, transRes] = await Promise.all([
        api.get<Motorista[]>('/api/motoristas'),
        api.get<TransportadoraApi[]>('/api/transportadoras')
      ]);
      setMotoristas(motRes.data);
      setTransportadoras(transRes.data);
    }catch(err){
      console.error(err);
      setSnackbar({open:true,message:'Erro ao carregar dados', severity:'error'});
    }finally{setLoading(false);}
  };

  const handleExcluirMotorista = async (motorista: Motorista) => {
    setDeleteDialog({ open: true, motorista });
  };

  const confirmarExclusao = async () => {
    if (!deleteDialog.motorista) return;
    
    const motoristaId = deleteDialog.motorista.id;
    setDeleting(motoristaId);
    
    try {
      // Usar POST ao invés de DELETE para contornar erro 405
      const response = await api.post('/api/motoristas/delete', { id: motoristaId });
      
      if (response.status === 200) {
        setSnackbar({
          open: true,
          message: 'Motorista excluído com sucesso!',
          severity: 'success'
        });
        await carregar();
      }
    } catch (error: any) {
      console.error('Erro ao excluir motorista:', error);
      
      let errorMessage = 'Erro ao excluir motorista. Tente novamente.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setDeleting(null);
      setDeleteDialog({ open: false, motorista: null });
    }
  };

  const canDelete = () => {
    return user?.tipo === 'ADMIN' || user?.tipo === 'GERENTE';
  };

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>Motoristas</Typography>
        </Box>
        
        <Paper component="div" sx={{ p: 2, mb: 2 }}>
          <Typography variant="body1">Lista de motoristas cadastrados no sistema</Typography>
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
                {(canDelete()) && <TableCell>Ações</TableCell>}
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
                  {(canDelete()) && (
                    <TableCell>
                      <IconButton
                        onClick={() => handleExcluirMotorista(m)}
                        color="error"
                        size="small"
                        disabled={deleting === m.id}
                      >
                        {deleting === m.id ? <CircularProgress size={20} /> : <DeleteIcon />}
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <CircularProgress sx={{ m:2 }}/>}  
        </TableContainer>

        {/* Diálogo de confirmação de exclusão */}
        <Dialog
          open={deleteDialog.open}
          onClose={() => setDeleteDialog({ open: false, motorista: null })}
        >
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Tem certeza que deseja excluir o motorista "{deleteDialog.motorista?.nome}"?
              Esta ação não pode ser desfeita.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog({ open: false, motorista: null })}>Cancelar</Button>
            <Button 
              onClick={confirmarExclusao} 
              color="error" 
              variant="contained"
              disabled={deleting !== null}
            >
              {deleting ? <CircularProgress size={20} /> : 'Excluir'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar 
          open={snackbar.open} 
          autoHideDuration={4000} 
          onClose={()=>setSnackbar({...snackbar,open:false})} 
          anchorOrigin={{vertical:'top',horizontal:'center'}}
        >
          <Alert severity={snackbar.severity} onClose={()=>setSnackbar({...snackbar,open:false})}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Layout>
  );
}

const MotoristasPage = () => (
  <ProtectedRoute>
    <MotoristasContent />
  </ProtectedRoute>
);

export default MotoristasPage;
