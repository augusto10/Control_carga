import { TipoUsuario } from '@prisma/client';

export interface User {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  ultimoAcesso: Date | null;
  dataCriacao: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface RegisterData extends LoginCredentials {
  nome: string;
  tipo: TipoUsuario;
  confirmarSenha: string;
}

export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: TipoUsuario[];
  redirectTo?: string;
  requireActiveUser?: boolean;
}

export const USER_TYPES = {
  ADMIN: 'ADMIN' as TipoUsuario,
  GERENTE: 'GERENTE' as TipoUsuario,
  USUARIO: 'USUARIO' as TipoUsuario
} as const;

export type UserTypes = typeof USER_TYPES[keyof typeof USER_TYPES];
