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
  Alert
} from '@mui/material';
import { api } from '@/services/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';

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

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, py: 2 }}>
        <Typography variant="h4" gutterBottom>Motoristas</Typography>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {loading && <CircularProgress sx={{ m:2 }}/>}  
        </TableContainer>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={()=>setSnackbar({...snackbar,open:false})} anchorOrigin={{vertical:'top',horizontal:'center'}}>
          <Alert severity={snackbar.severity} onClose={()=>setSnackbar({...snackbar,open:false})}>{snackbar.message}</Alert>
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
