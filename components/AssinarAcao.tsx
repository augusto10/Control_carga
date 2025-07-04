import { Button } from '@mui/material';
import { Send } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { useState } from 'react';

interface AssinarAcaoProps {
  controleId: string;
  motorista: string;
  responsavel: string;
  cpfMotorista: string;
}

export default function AssinarAcao({ controleId, motorista, responsavel, cpfMotorista }: AssinarAcaoProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAssinar = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/controles/assinatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controleId, motorista, responsavel, cpfMotorista })
      });
      if (!response.ok) throw new Error('Erro ao enviar para assinatura');
      router.push('/controles');
    } catch (error) {
      alert('Erro ao assinar controle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="contained"
      color="success"
      startIcon={<Send />}
      onClick={handleAssinar}
      disabled={loading}
    >
      Assinar
    </Button>
  );
}
