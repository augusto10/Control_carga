import { User, AuthError, LoginCredentials, USER_TYPES } from './auth-types';

// Tipagem para o estado de autenticação
export type AuthState = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
};

// Tipagem para o contexto de autenticação
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

// Tipagem para as props do AuthProvider
export interface AuthProviderProps {
  children: React.ReactNode;
}
