import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { NextPageContext } from 'next';
import Cookies from 'js-cookie';
import { api } from '../services/api';
import { User, USER_TYPES, LoginCredentials, AuthError } from '../types/auth-types';
import { AuthState, AuthContextType } from '../types/auth-context';
import jwt from 'jsonwebtoken';

type ServerRequest = NextPageContext['req'] & {
  headers: {
    cookie?: string;
  };
};

type CookieOptions = Cookies.CookieAttributes;

// Função para obter cookie no servidor
function getServerCookie(name: string, req?: NextPageContext['req']): string | undefined {
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
  return Cookies.get(name);
};



const setCookie = (name: string, value: string, options: Cookies.CookieAttributes = {}): void => {
  if (typeof window !== 'undefined') {
    Cookies.set(name, value, { 
      path: '/',
      expires: TOKEN_EXPIRATION_DAYS, // 7 dias
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      ...options 
    });
  }
};

const removeCookie = (name: string): void => {
  if (typeof window !== 'undefined') {
    Cookies.remove(name, { path: '/' });
  }
};

// Tempo de expiração do token (1 hora)
const TOKEN_EXPIRATION_MS = 3600000;
const TOKEN_EXPIRATION_DAYS = 7;

// Re-export para compatibilidade
export type { AuthContextType } from '../types/auth-context';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });
  
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const router = useRouter();

  // Atualizar estado de forma segura
  const updateAuthState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  // Carregar usuário do armazenamento
  const loadUserFromStorage = useCallback(async () => {
    try {
      console.log('[AuthContext] Carregando usuário do armazenamento...');
      const token = getCookie('auth_token');
      
      if (!token) {
        console.log('[AuthContext] Nenhum token encontrado');
        updateAuthState({ 
          isLoading: false, 
          isAuthenticated: false,
          user: null,
          token: null,
          error: null
        });
        return;
      }

      console.log('[AuthContext] Token encontrado, verificando validade...');
      try {
        // Verificar se o token é válido
        const decoded = jwt.verify(token, process.env.NEXT_PUBLIC_JWT_SECRET || '') as { exp?: number };
        if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
          throw new Error('Token expirado');
        }

        // Buscar informações do usuário
        const response = await api.get('/api/auth/me');
        const userData = response.data;
        
        updateAuthState({
          user: userData,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        
        // Atualizar header de autorização
        api.defaults.headers.Authorization = `Bearer ${token}`;
        
      } catch (err) {
        console.error('[AuthContext] Erro ao verificar token:', err);
        // Se houver erro, limpa o estado e redireciona para o login
        updateAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Sessão expirada. Faça login novamente.'
        });
        
        // Remover token inválido
        removeCookie('auth_token');
        delete api.defaults.headers.Authorization;
        
        // Redirecionar para login se não estiver na página de login
        if (router.pathname !== '/login') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('[AuthContext] Erro ao carregar autenticação:', err);
      updateAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Erro ao carregar autenticação'
      });
    }
  }, [router, updateAuthState]);

  // Efeito para carregar o usuário ao montar o componente
  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  const login = useCallback(async ({ email, senha }: LoginCredentials): Promise<void> => {
    try {
      updateAuthState({ 
        isLoading: true, 
        error: null,
        isAuthenticated: false,
        user: null,
        token: null
      });
      setAuthError(null);
      
      console.log('[AuthContext] Fazendo login com:', { email });
      const response = await api.post('/api/auth/login', { email, senha });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Erro ao fazer login. Tente novamente.');
      }
      
      const { user, token } = response.data;
      
      if (!token) {
        throw new Error('Token não recebido do servidor');
      }
      
      // Armazenar token em cookie seguro
      setCookie('auth_token', token, { 
        path: '/',
        expires: TOKEN_EXPIRATION_DAYS,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false // Necessário para ser acessível pelo cliente
      });
      
      // Atualizar header de autorização
      api.defaults.headers.Authorization = `Bearer ${token}`;
      
      // Atualizar estado
      updateAuthState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      // Redirecionar com base no tipo de usuário
      if (user.tipo === USER_TYPES.ADMIN) {
        await router.push('/admin');
      } else {
        await router.push('/dashboard');
      }
      
    } catch (error: any) {
      console.error('[AuthContext] Erro no login:', error);
      
      // Mensagem de erro amigável
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais e tente novamente.';
      
      if (error.response) {
        // Erro da API
        errorMessage = error.response.data?.message || errorMessage;
      } else if (error.request) {
        // Erro de rede ou servidor indisponível
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
      } else if (error.message) {
        // Erro lançado manualmente
        errorMessage = error.message;
      }
      
      console.error('[AuthContext] Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });
      
      // Atualizar estado com erro
      updateAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage
      });
      
      // Remover token inválido
      removeCookie('auth_token');
      delete api.defaults.headers.Authorization;
      
      // Lançar o erro novamente para que os componentes possam lidar com ele, se necessário
      throw error;
    }
  }, [router, updateAuthState]);

  const logout = useCallback(() => {
    try {
      // Remove os cookies
      removeCookie('auth_token');
      removeCookie('user');
      
      // Limpa o header de autorização
      delete api.defaults.headers.Authorization;
      
      // Atualiza o estado
      updateAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      
      // Redireciona para a página de login
      router.push('/login');
    } catch (error) {
      console.error('[AuthContext] Erro durante o logout:', error);
      // Garante que o estado seja limpo mesmo em caso de erro
      updateAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Ocorreu um erro durante o logout'
      });
    }
  }, [router, updateAuthState]);

  const updateUser = useCallback((userData: Partial<User>) => {
    setState((prevState) => ({
      ...prevState,
      user: prevState.user ? { ...prevState.user, ...userData } : null
    }));
  }, []);

  const checkTokenExpiration = useCallback((): boolean => {
    const token = getCookie('auth_token');
    if (!token) return false;
    
    try {
      const decoded = jwt.decode(token) as { exp?: number };
      const isExpired = decoded?.exp && decoded.exp * 1000 < Date.now();
      
      if (isExpired) {
        console.log('[AuthContext] Token expirado');
        logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      logout();
      return false;
    }
  }, [logout]);

  useEffect(() => {
    // Verificação inicial ao montar o componente
    checkTokenExpiration();
    
    // Configura verificação periódica a cada 5 minutos
    const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000);
    
    // Limpa o intervalo ao desmontar o componente
    return () => clearInterval(interval);
  }, [checkTokenExpiration]);

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
