import prisma from '@/lib/prisma';

/**
 * Credenciais do separador consultadas em `Usuario`.
 *
 * `senhaAdm` fica em texto puro por necessidade funcional: ela é repassada
 * em claro no payload do job para o agente autenticar no ERP — um hash
 * bcrypt a tornaria ilegível. Nunca expor o campo em APIs de listagem.
 *
 * `biometria` é placeholder até a escolha do leitor: guarda o template/ID
 * que o aparelho devolver; o match hoje é por igualdade exata.
 */
export type SeparadorValido = {
  id: string;
  nome: string;
  codigoAdm: number;
  senhaAdm: string;
};

const SELECIONAR_CREDENCIAIS = {
  id: true,
  nome: true,
  ativo: true,
  codigoAdm: true,
  senhaAdm: true,
} as const;

function toSeparador(usuario: {
  id: string;
  nome: string;
  ativo: boolean;
  codigoAdm: number | null;
  senhaAdm: string | null;
}): SeparadorValido | null {
  if (!usuario.ativo || usuario.codigoAdm == null || !usuario.senhaAdm) {
    return null;
  }
  return {
    id: usuario.id,
    nome: usuario.nome,
    codigoAdm: usuario.codigoAdm,
    senhaAdm: usuario.senhaAdm,
  };
}

/**
 * Fallback manual: localiza o `Usuario` pelo par codigoAdm + senhaAdm.
 * Retorna `null` quando não há usuário, está inativo ou sem credenciais ADM.
 */
export async function validarSeparador(
  codigoAdm: number,
  senhaAdm: string
): Promise<SeparadorValido | null> {
  const usuario = await prisma.usuario.findFirst({
    where: { codigoAdm, senhaAdm },
    select: SELECIONAR_CREDENCIAIS,
  });
  if (!usuario) return null;
  return toSeparador(usuario);
}

/**
 * Caminho primário (placeholder do leitor): localiza o `Usuario` cujo
 * `biometria` bate exatamente com o valor enviado pelo totem e devolve
 * suas credenciais ADM para o payload do job.
 */
export async function buscarSeparadorPorBiometria(
  biometria: string
): Promise<SeparadorValido | null> {
  const valor = biometria.trim();
  if (!valor) return null;

  const usuario = await prisma.usuario.findFirst({
    where: { biometria: valor },
    select: SELECIONAR_CREDENCIAIS,
  });
  if (!usuario) return null;
  return toSeparador(usuario);
}
