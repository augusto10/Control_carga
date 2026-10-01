export function dadosPedido(pedido: Record<string, any> = {}, logistica: Record<string, any> | null = null) {
  const fontes = [pedido, logistica?.pedido || {}];
  const texto = (campos: string[], registros = fontes) => {
    for (const registro of registros) {
      for (const campo of campos) {
        const valor = registro[campo];
        if (typeof valor === 'string' && valor.trim()) return valor.trim();
      }
    }
    return null;
  };
  const separacoes = Array.isArray(logistica?.separacoes) ? logistica.separacoes : [];
  const nomes = (campos: string[]) => [...new Set(separacoes.map((item) => texto(campos, [item])).filter(Boolean))].join(', ') || null;
  const nomeUsuario = (campo: string) => [...new Set(separacoes.map((item) => {
    const usuario = item[campo];
    return usuario && typeof usuario === 'object' ? texto(['NOME', 'nome', 'NOME_USUARIO'], [usuario]) : null;
  }).filter(Boolean))].join(', ') || null;
  return {
    cidade: texto(['CIDADE_ENTREGA_NOME', 'NOME_CIDADE', 'CIDADE', 'cidade']),
    bairro: texto(['BAIRRO_ENTREGA_NOME', 'NOME_BAIRRO_NOTA', 'NOME_BAIRRO', 'BAIRRO', 'bairro']),
    uf: texto(['UF_ENTREGA', 'ESTADO_ENTREGA_ID', 'ESTADO_DESTINO', 'UF', 'uf']),
    separadorNome: nomes(['FUNCIONARIO_SEPARACAO_NOME', 'USUARIO_SEPARACAO_NOME', 'SEPARADOR_NOME', 'USUARIO_NOME']) || nomeUsuario('USUARIO_SEPARACAO') || texto(['separador_nome', 'FUNCIONARIO_SEPARACAO_NOME', 'USUARIO_SEPARACAO_NOME']),
    conferenteNome: nomes(['USUARIO_CONFERENCIA_NOME', 'CONFERENTE_NOME', 'USUARIO_BAIXA_NOME']) || nomeUsuario('USUARIO_BAIXA') || texto(['conferente_nome', 'USUARIO_CONFERENCIA_NOME']) || texto(['usuario_confirmacao_nome'], [logistica?.status_logistico || {}, pedido.status_logistico || {}]),
  };
}
