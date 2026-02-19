import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { api } from '@/services/api';
import { parseCookies, setCookie, destroyCookie } from 'nookies';

type User = {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  ativo: boolean;
  dataCriacao: Date;
  ultimoAcesso?: Date;
};

type SignInCredentials = {
  email: string;
  senha: string;
};

type AuthContextData = {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthContext = createContext({} as AuthContextData);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Verificar se o usuário está autenticado ao carregar a página
  useEffect(() => {
    async function loadUserFromCookies() {
      try {
        setLoading(true);
        
        // Verifica se existe um token nos cookies
        const { 'auth_token': token } = parseCookies();
        
        if (token) {
          // Tenta buscar os dados do usuário
          const { data } = await api.get('/api/auth/me');
          
          if (data?.user) {
            setUser(data.user);
          } else {
            // Se não encontrar o usuário, faz logout
            signOut();
          }
        } else {
          // Se não tiver token, garante que o usuário está deslogado
          setUser(null);
        }
      } catch (err) {
        console.error('Erro ao carregar usuário:', err);
        // Em caso de erro, faz logout
        signOut();
      } finally {
        setLoading(false);
      }
    }
    
    loadUserFromCookies();
  }, []);

  // Função para fazer login
  const signIn = async ({ email, senha }: SignInCredentials) => {
    try {
      setLoading(true);
      setError(null);
      
      // Faz a requisição de login
      const response = await api.post('/api/auth/login', { email, senha });
      
      if (response.data?.user) {
        // Atualiza o estado do usuário
        setUser(response.data.user);
        
        // Redireciona para a página inicial ou para a página que o usuário tentou acessar
        const redirectTo = router.query.redirectTo || '/';
        router.push(redirectTo as string);
      }
    } catch (err: any) {
      console.error('Erro ao fazer login:', err);
      
      // Trata erros de autenticação
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
      
      // Propaga o erro para que o componente de login possa exibi-lo
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer logout
  const signOut = () => {
    try {
      // Remove o token do cookie
      destroyCookie(undefined, 'auth_token', {
        path: '/',
      });
      
      // Limpa o estado do usuário
      setUser(null);
      
      // Redireciona para a página de login
      router.push('/login');
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        signIn,
        signOut,
        user,
        isAuthenticated: !!user,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
