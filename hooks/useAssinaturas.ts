import { useState, useEffect } from 'react';
import api from '../services/api';

interface Assinatura {
  id: string;
  tipo: 'MOTORISTA' | 'RESPONSVEL';
  status: 'PENDENTE' | 'ASSINADO';
  urlAssinatura: string | null;
  signedFileUrl: string | null;
}

interface UseAssinaturasReturn {
  assinaturas: Assinatura[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAssinaturas(controleId: string): UseAssinaturasReturn {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchAssinaturas() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get(`/controles/${controleId}/assinaturas`);
        setAssinaturas(response.data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Erro ao carregar assinaturas'));
      } finally {
        setIsLoading(false);
      }
    }

    if (controleId) {
      fetchAssinaturas();
    }
  }, [controleId]);

  const refetch = () => {
    if (controleId) {
      fetchAssinaturas();
    }
  };

  return {
    assinaturas,
    isLoading,
    error,
    refetch,
  };
}
