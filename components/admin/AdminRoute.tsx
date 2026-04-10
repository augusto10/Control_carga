import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { USER_TYPES } from '../../types/auth-types';
import { RefreshCw } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Se ainda está carregando, não faz nada
    if (isLoading) return;

    // Se não está autenticado, redireciona para o login
    if (!isAuthenticated) {
      console.log('[AdminRoute] Usuário não autenticado, redirecionando para login...');
      router.push('/login');
      return;
    }

    // Se está autenticado, verifica se é administrador ou gerente
    if (user) {
      const isAuthorized = user.tipo === USER_TYPES.ADMIN || user.tipo === USER_TYPES.GERENTE;
      if (!isAuthorized) {
        console.log('[AdminRoute] Acesso negado: usuário não é administrador ou gerente');
        router.push('/acesso-negado');
        return;
      }
    }

    // Se chegou até aqui, está tudo ok
    setIsChecking(false);
  }, [isLoading, isAuthenticated, user, router]);

  // Mostra um loader enquanto verifica a autenticação
  if (isLoading || isChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin opacity-20" />
        <p className="text-slate-400 font-medium animate-pulse">Verificando permissões...</p>
      </div>
    );
  }

  // Se o usuário está autenticado e é administrador ou gerente, renderiza os filhos
  if (isAuthenticated && (user?.tipo === USER_TYPES.ADMIN || user?.tipo === USER_TYPES.GERENTE)) {
    return <>{children}</>;
  }

  // Se não está autorizado e não está carregando, não renderiza nada
  return null;
}
