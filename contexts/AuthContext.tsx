import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { getClientCookie, setClientCookie, deleteClientCookie } from 'cookies-next';
import { api } from '../services/api';
import { User, AuthError, ProtectedRouteProps, USER_TYPES, AuthState, LoginCredentials } from '../types/auth-types';
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http'; // For server-side cookie handling

// Função para obter cookie no servidor
function getServerCookie(name: string, req?: IncomingMessage): string | undefined {
  if (!req?.headers.cookie) return undefined;
  const cookieValue = req.headers.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];
  return cookieValue ? decodeURIComponent(cookieValue) : undefined;
}

// Funções para uso no cliente
const getCookie = (name: string): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  return getClientCookie(name) as string | undefined;
};

const setCookie = (name: string, value: string, options: any = {}): void => {
  if (typeof window === 'undefined') return;
  setClientCookie(name, value, options);
};

const removeCookie = (name: string): void => {
  if (typeof window === 'undefined') return;
  deleteClientCookie(name);
};

// Tempo de expiração do token (1 hora)
const TOKEN_EXPIRATION = 3600000;

export interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  updateUser: (userData: Partial<User>) => void;
  checkTokenExpiration: () => void;
  authError: AuthError | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  });
  const [authError, setAuthError] = useState<AuthError | null>(null);

  const router = useRouter();

  // Verificar autenticação ao carregar
  useEffect(() => {
    async function loadUserFromStorage() {
      try {
        const token = getCookie('@ControlCarga:token');
        if (token) {
          try {
            // Verificar se o token é válido
            const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET || '') as any;
            if (Date.now() >= decoded.exp * 1000) {
              throw new Error('Token expirado');
            }

            // Buscar informações do usuário
            const response = await api.get('/api/auth/me');
            const userData = response.data;
            
            setState(prev => ({
              ...prev,
              user: userData,
              token,
              isAuthenticated: true,
              isLoading: false
            }));
            
            // Atualiza o header de autorização
            api.defaults.headers.Authorization = `Bearer ${token}`;
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setAuthError({
              code: 'INVALID_TOKEN',
              message: 'Token inválido ou expirado',
              details: { error: errorMessage }
            });
            logout();
          }
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false
          }));
        }
      } catch (err) {
        console.error('Erro ao carregar autenticação:', err);
        logout();
      }
    }

    loadUserFromStorage();
  }, []);

  const login = async ({ email, senha }: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      setAuthError(null);

      const response = await api.post('/auth/login', { email, senha });
      const { user, token } = response.data;

      // Armazenar token em cookie seguro (httpOnly, secure, sameSite)
      setCookie('token', token, { 
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 dias
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });

      // Redirecionar com base no tipo de usuário
      if (user.tipo === USER_TYPES.ADMIN) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.message || 'Erro ao fazer login';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      setAuthError({
        message: errorMessage,
        code: err.response?.status || 500
      });
    }
  };

  const logout = () => {
    removeCookie('@ControlCarga:token');
    removeCookie('@ControlCarga:user');
    delete api.defaults.headers.Authorization;
    setState(prev => ({
      ...prev,
      user: null,
      token: null,
      isAuthenticated: false
    }));
    router.push('/login');
  };

  const updateUser = (userData: Partial<User>) => {
    setState(prev => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null
    }));
  };

  const checkTokenExpiration = () => {
    const token = getCookie('token');
    if (token) {
      try {
        const decoded = jwt.decode(token) as { exp?: number };
        if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
          logout();
        }
      } catch (error) {
        console.error('Error checking token expiration:', error);
        logout();
      }
    }
  };

  useEffect(() => {
    // Check token expiration periodically (every 5 minutes)
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        user: state.user, 
        login, 
        logout, 
        isLoading: state.isLoading, 
        error: state.error, 
        isAuthenticated: state.isAuthenticated,
        updateUser,
        checkTokenExpiration,
        authError
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
