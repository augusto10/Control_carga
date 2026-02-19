import { TipoUsuario } from '@prisma/client';

export interface User {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface RegisterData extends LoginCredentials {
  nome: string;
  confirmarSenha: string;
}

export type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: TipoUsuario[];
  redirectTo?: string;
};
