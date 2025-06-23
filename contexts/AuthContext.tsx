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
  if (!req?.headers?.cookie) return undefined;
  const cookie = require('cookie');
  const cookies = cookie.parse(req.headers.cookie || '');
  return cookies[name] ? decodeURIComponent(cookies[name]) : undefined;
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
  const updateAuthState = useCallback(
    (updates: Partial<AuthState> | ((prev: AuthState) => Partial<AuthState>)) => {
      if (typeof updates === 'function') {
        setState(prev => ({
          ...prev,
          ...updates(prev)
        }));
      } else {
        setState(prev => ({
          ...prev,
          ...updates
        }));
      }
    }, 
    []
  );

  // Lista de rotas públicas que não requerem autenticação
  const publicRoutes = useMemo(() => ['/login', '/esqueci-senha', '/cadastro'], []);

  // Carregar usuário do armazenamento
  const loadUserFromStorage = useCallback(async (forceCheck: boolean = false) => {
    // Função auxiliar para verificar se deve atualizar o estado
    const shouldUpdateState = (updates: Partial<AuthState>): boolean => {
      return Object.entries(updates).some(([key, value]) => {
        const stateKey = key as keyof AuthState;
        const currentValue = state[stateKey];
        return JSON.stringify(currentValue) !== JSON.stringify(value);
      });
    };
    // Se já estiver carregando e não for uma verificação forçada, não faz nada
    if (state.isLoading && !forceCheck) {
      console.log('[AuthContext] Já está carregando, pulando...');
      return;
    }

    console.log('[AuthContext] Iniciando verificação de autenticação...');
    console.log('[AuthContext] Rota atual:', router.pathname);
    
    // Se for uma rota pública, não precisa verificar autenticação
    if (publicRoutes.includes(router.pathname)) {
      console.log('[AuthContext] Rota pública, pulando verificação de autenticação');
      const newState: Partial<AuthState> = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      };
      
      if (shouldUpdateState(newState)) {
        updateAuthState(newState);
      }
      return;
    }

    try {
      console.log('[AuthContext] Verificando autenticação...');
      
      // Atualiza o estado para carregamento apenas se não for uma verificação forçada
      updateAuthState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));
      
      console.log('[AuthContext] Fazendo requisição para /api/auth/me');
      const response = await api.get('/api/auth/me');
      
      if (response.data && response.data.success) {
        console.log('[AuthContext] Usuário autenticado:', response.data.user);
        updateAuthState({
          user: response.data.user,
          token: 'http-only-cookie',
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
        
        // Se estiver na página de login, redireciona para o dashboard apropriado
        if (router.pathname === '/login') {
          const redirectPath = response.data.user.tipo === USER_TYPES.ADMIN ? '/admin' : '/dashboard';
          console.log(`[AuthContext] Redirecionando para ${redirectPath}...`);
          router.push(redirectPath);
        }
      } else {
        console.log('[AuthContext] Nenhum usuário autenticado encontrado');
        throw new Error('Falha ao carregar dados do usuário');
      }
    } catch (error: any) {
      console.error('[AuthContext] Erro ao carregar usuário:', error);
      
      // Só atualiza o estado se for diferente do estado atual
      const newState: Partial<AuthState> = {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: error.response?.status === 401 
          ? 'Sessão expirada' 
          : 'Erro na autenticação'
      };
      
      if (shouldUpdateState(newState)) {
        updateAuthState(newState);
        
        // Se não estiver em uma rota pública, redireciona para o login
        if (!publicRoutes.includes(router.pathname) && router.pathname !== '/') {
          console.log(`[AuthContext] Redirecionando para login de ${router.pathname}...`);
          router.push('/login');
        }
      }
    }
  }, [router, state, updateAuthState, publicRoutes]);

  // Efeito para carregar o usuário ao montar o componente
  useEffect(() => {
    // Carrega o usuário apenas uma vez ao montar o componente
    loadUserFromStorage(true); // força a verificação
    
    // Adiciona listener para eventos de não autorizado
    const handleUnauthorized = () => {
      console.log('[AuthContext] Evento de não autorizado recebido');
      
      // Atualiza o estado apenas se ainda estiver autenticado
      if (state.isAuthenticated) {
        updateAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Sua sessão expirou. Por favor, faça login novamente.'
        });
        
        // Redireciona para a página de login se não estiver nela
        if (router.pathname !== '/login') {
          console.log('[AuthContext] Redirecionando para login...');
          router.push('/login');
        }
      }
    };
    
    window.addEventListener('unauthorized', handleUnauthorized);
    
    // Limpa o listener ao desmontar o componente
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []); // Removidas as dependências para evitar loops

  const login = useCallback(async ({ email, senha }: LoginCredentials): Promise<void> => {
    try {
      // Atualiza o estado para carregamento
      updateAuthState({ 
        isLoading: true, 
        error: null,
        isAuthenticated: false,
        user: null,
        token: null
      });
      setAuthError(null);
      
      console.log('[AuthContext] Iniciando processo de login...');
      
      // Faz a requisição de login - o cookie HTTP-only será definido na resposta
      const response = await api.post('/api/auth/login', { email, senha });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Erro ao fazer login. Tente novamente.');
      }
      
      const { data: user } = response.data;
      
      if (!user) {
        throw new Error('Dados do usuário não recebidos');
      }
      
      console.log('[AuthContext] Login bem-sucedido, buscando dados do usuário...');
      
      // Após o login, busca os dados completos do usuário para garantir que está autenticado
      const userResponse = await api.get('/api/auth/me');
      
      if (!userResponse.data || !userResponse.data.success) {
        throw new Error('Falha ao carregar dados do usuário após login');
      }
      
      // Atualiza o estado com os dados do usuário
      updateAuthState({
        user: userResponse.data.user,
        token: 'http-only-cookie', // Indica que estamos usando cookie HTTP-only
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
      
      // Redireciona com base no tipo de usuário
      const redirectPath = userResponse.data.user.tipo === USER_TYPES.ADMIN ? '/admin' : '/dashboard';
      console.log(`[AuthContext] Redirecionando para: ${redirectPath}`);
      await router.push(redirectPath);
      
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

  const logout = useCallback(async () => {
    try {
      console.log('[AuthContext] Iniciando logout...');
      
      // Faz uma chamada para o endpoint de logout no servidor
      // Isso garantirá que o cookie HTTP-only seja removido
      try {
        await api.post('/api/auth/logout');
      } catch (error) {
        console.error('[AuthContext] Erro ao chamar endpoint de logout:', error);
        // Continua mesmo que haja erro, para garantir que o estado seja limpo
      }
      
      // Limpa o estado local
      updateAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      
      console.log('[AuthContext] Logout concluído, redirecionando para login...');
      
      // Redireciona para a página de login
      await router.push('/login');
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
      
      // Força o redirecionamento mesmo em caso de erro
      router.push('/login');
    }
  }, [router, updateAuthState]);

  const updateUser = useCallback((userData: Partial<User>) => {
    setState((prevState) => ({
      ...prevState,
      user: prevState.user ? { ...prevState.user, ...userData } : null
    }));
  }, []);

  const checkTokenExpiration = useCallback(async (): Promise<boolean> => {
    // Se já não estiver autenticado, não precisa verificar
    if (!state.isAuthenticated) {
      console.log('[AuthContext] Usuário não autenticado, pulando verificação de token');
      return false;
    }

    try {
      console.log('[AuthContext] Verificando expiração do token...');
      
      // Tenta fazer uma requisição para verificar a autenticação
      const response = await api.get('/api/auth/me');
      
      // Se chegou aqui, o token ainda é válido
      if (response.data?.success) {
        console.log('[AuthContext] Token válido');
        return true;
      }
      
      // Se a resposta não for bem-sucedida, considera como expirado
      console.log('[AuthContext] Sessão expirada ou inválida');
      
      // Atualiza o estado para não autenticado
      updateAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Sessão expirada. Por favor, faça login novamente.'
      });
      
      // Só redireciona se não estiver na página de login
      if (router.pathname !== '/login') {
        console.log('[AuthContext] Redirecionando para login...');
        await router.push('/login');
      }
      
      return false;
      
    } catch (error) {
      console.error('[AuthContext] Erro ao verificar expiração do token:', error);
      
      // Em caso de erro, apenas atualiza o estado sem redirecionar
      // O redirecionamento será tratado pelo componente ProtectedRoute
      updateAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Erro ao verificar autenticação'
      });
      
      return false;
    }
  }, [state.isAuthenticated, router, updateAuthState]);

  useEffect(() => {
    // Função para verificar a expiração do token
    const checkAuth = async () => {
      try {
        // Só verifica se estiver autenticado
        if (state.isAuthenticated) {
          console.log('[AuthContext] Verificando expiração do token...');
          await checkTokenExpiration();
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      }
    };

    // Verificação inicial ao montar o componente
    // Só executa se estiver autenticado
    if (state.isAuthenticated) {
      console.log('[AuthContext] Iniciando verificação periódica de autenticação...');
      checkAuth();
    }
    
    // Configura verificação periódica a cada 5 minutos
    // Só se estiver autenticado
    let interval: NodeJS.Timeout | null = null;
    
    if (state.isAuthenticated) {
      interval = setInterval(checkAuth, 5 * 60 * 1000);
    }
    
    // Limpa o intervalo ao desmontar o componente
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [checkTokenExpiration, state.isAuthenticated]);

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
