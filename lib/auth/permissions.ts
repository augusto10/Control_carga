type UserRole = {
  tipo: string;
};

type ControleStatus = {
  finalizado: boolean;
};

type ControleDeleteStatus = ControleStatus & {
  notasCount: number;
};

export function canEditControle(
  user: UserRole | null | undefined,
  controle: ControleStatus
): boolean {
  return user !== null
    && user !== undefined
    && (!controle.finalizado || user.tipo === 'ADMIN');
}

export function canDeleteControle(
  user: UserRole | null | undefined,
  _controle?: ControleDeleteStatus
): boolean {
  return user?.tipo === 'ADMIN';
}
