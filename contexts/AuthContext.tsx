import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { User, LoginCredentials } from '../types/auth';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Verificar autenticação ao carregar
  useEffect(() => {
    async function loadUserFromStorage() {
      const token = localStorage.getItem('@ControlCarga:token');
      const userData = localStorage.getItem('@ControlCarga:user');

      if (token && userData) {
        try {
          api.defaults.headers.Authorization = `Bearer ${token}`;
          // Aqui você pode adicionar uma rota de validação de token
          setUser(JSON.parse(userData));
        } catch (err) {
          console.error('Erro ao carregar usuário', err);
          localStorage.removeItem('@ControlCarga:token');
          localStorage.removeItem('@ControlCarga:user');
        }
      }
      setIsLoading(false);
    }

    loadUserFromStorage();
  }, []);

  const login = async ({ email, senha }: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fazendo login com:', { email });
      const response = await api.post('/api/auth/login', { email, senha });
      const { user, token } = response.data;

      console.log('Resposta do login:', { user, hasToken: !!token });

      // Salva o token e o usuário no localStorage
      localStorage.setItem('@ControlCarga:token', token);
      localStorage.setItem('@ControlCarga:user', JSON.stringify(user));
      
      // Atualiza o header de autorização para requisições futuras
      if (api.defaults.headers) {
        api.defaults.headers.Authorization = `Bearer ${token}`;
      }
      
      setUser(user);
      
      // Redirecionar com base no tipo de usuário
      const redirectPath = user.tipo === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
      console.log('Redirecionando para:', redirectPath);
      router.push(redirectPath);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('@ControlCarga:token');
    localStorage.removeItem('@ControlCarga:user');
    delete api.defaults.headers.Authorization;
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        login, 
        logout, 
        isLoading, 
        error, 
        isAuthenticated: !!user 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
