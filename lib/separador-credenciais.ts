import prisma from '@/lib/prisma';

/**
 * Credenciais de separação (mock).
 *
 * Placeholder da futura autenticação por biometria: quando ela chegar, basta
 * trocar `validarSeparador` para consultar o serviço real — o endpoint
 * /api/separacao/associar não muda.
 *
 * `senhaAdm` em texto puro por decisão de escopo (mock).
 */
export const SEPARADORES_MOCK: Array<{
  codigoAdm: number;
  senhaAdm: string;
  nome: string;
  email: string;
}> = [
  { codigoAdm: 101, senhaAdm: '1234', nome: 'Separador Um', email: 'separador1@totem.local' },
  { codigoAdm: 102, senhaAdm: '1234', nome: 'Separador Dois', email: 'separador2@totem.local' },
  { codigoAdm: 103, senhaAdm: '1234', nome: 'Separador Três', email: 'separador3@totem.local' },
];

export type SeparadorValido = {
  id: string;
  nome: string;
};

/**
 * Valida codigoAdm + senhaAdm contra o mock e garante um `Usuario` ativo e
 * do tipo SEPARADOR para satisfazer a FK de `Pedidos.usuarioId`.
 *
 * Retorna `null` quando a credencial é inválida ou o usuário está inativo.
 */
export async function validarSeparador(
  codigoAdm: number,
  senhaAdm: string
): Promise<SeparadorValido | null> {
  const credencial = SEPARADORES_MOCK.find(
    (item) => item.codigoAdm === codigoAdm && item.senhaAdm === senhaAdm
  );
  if (!credencial) return null;

  const usuario = await prisma.usuario.upsert({
    where: { email: credencial.email },
    update: { nome: credencial.nome, tipo: 'SEPARADOR' },
    create: {
      nome: credencial.nome,
      email: credencial.email,
      senha: 'MOCK_TOTEM', // hash inatingível — login por senha permanece bloqueado
      tipo: 'SEPARADOR',
    },
    select: { id: true, nome: true, ativo: true },
  });

  if (!usuario.ativo) return null;
  return { id: usuario.id, nome: usuario.nome };
}
