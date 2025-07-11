import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export default function SeparacaoConferenciaIndex() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    // Redireciona para a página do perfil correto
    switch (user.tipo) {
      case 'SEPARADOR':
        router.replace('/separacao-conferencia/separadores');
        break;
      case 'CONFERENTE':
        router.replace('/separacao-conferencia/conferentes');
        break;
      case 'AUDITOR':
        router.replace('/separacao-conferencia/auditores');
        break;
      case 'GERENTE':
        router.replace('/separacao-conferencia/gerentes');
        break;
      default:
        // Usuário sem perfil específico, pode exibir mensagem ou redirecionar para home
        router.replace('/');
    }
  }, [user, isLoading, router]);

  return null;
}
