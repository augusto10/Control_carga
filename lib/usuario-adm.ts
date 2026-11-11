/** A senha ADM precisa ser recuperável para envio ao ERP; não é a senha de login. */
export function camposAdm(body: { codigoAdm?: unknown; senhaAdm?: unknown }) {
  const data: { codigoAdm?: number | null; senhaAdm?: string } = {};
  if (body.codigoAdm !== undefined) {
    if (body.codigoAdm === null || body.codigoAdm === '') {
      data.codigoAdm = null;
    } else {
      const valor = String(body.codigoAdm);
      const codigo = Number(valor);
      if (!/^\d+$/.test(valor) || !Number.isInteger(codigo) || codigo < 0 || codigo > 2147483647) {
        throw new Error('Código ADM deve ser um número inteiro entre 0 e 2147483647.');
      }
      data.codigoAdm = codigo;
    }
  }
  if (body.senhaAdm !== undefined && typeof body.senhaAdm !== 'string') {
    throw new Error('Senha ADM inválida.');
  }
  // Em edição, deixar em branco mantém a senha já cadastrada.
  if (typeof body.senhaAdm === 'string' && body.senhaAdm !== '') data.senhaAdm = body.senhaAdm;
  return data;
}
