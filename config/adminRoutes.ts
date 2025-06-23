import { USER_TYPES } from '../types/auth-types';

export const ADMIN_ROUTES = [
  {
    path: '/admin',
    title: 'Visão Geral',
    icon: 'dashboard',
    roles: [USER_TYPES.ADMIN],
  },
  {
    path: '/admin/usuarios',
    title: 'Gerenciar Usuários',
    icon: 'people',
    roles: [USER_TYPES.ADMIN],
  },
  {
    path: '/admin/configuracoes',
    title: 'Configurações',
    icon: 'settings',
    roles: [USER_TYPES.ADMIN],
  },
];

export const userHasAccess = (userRole: string, path: string): boolean => {
  const route = ADMIN_ROUTES.find(r => r.path === path);
  if (!route) return false;
  return route.roles.includes(userRole as any);
};

export const getAdminRoutes = (userRole: string) => {
  return ADMIN_ROUTES.filter(route => route.roles.includes(userRole as any));
};
