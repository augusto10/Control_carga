export type RotaPrazoEntrega = {
  codigo: string;
  uf: string;
  prazo: string;
  transportadora: string;
  ativo?: boolean;
};

type DestinoPedido = {
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  transportadora?: string | null;
};

const normalizar = (valor?: string | null) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase()
  .replace(/[^A-Z0-9]+/g, ' ')
  .trim();

const extrairUf = (valor?: string | null) => normalizar(valor).split(' ').filter(Boolean).pop() || '';

const localDaRota = (codigo: string) => normalizar(codigo)
  .replace(/\s+(?:BR\s+)?(?:DF|GO)$/, '')
  .trim();

const rotaContidaNoDestino = (destino: string, local: string) =>
  Boolean(destino && local && ` ${destino} `.includes(` ${local} `));

const parseDataLocal = (valor?: string | Date | null) => {
  if (!valor) return null;
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime())
      ? null
      : new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }

  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const compacta = texto.match(/^(\d{4})(\d{2})(\d{2})/);
  const partes = iso || compacta;
  if (partes) {
    const data = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const data = new Date(texto);
  return Number.isNaN(data.getTime())
    ? null
    : new Date(data.getFullYear(), data.getMonth(), data.getDate());
};

export function prazoDaRotaForaDoPrazo(input: {
  dataBase?: string | Date | null;
  prazo?: string | null;
  hoje?: Date;
}): boolean {
  const prazo = String(input.prazo || '').trim().toUpperCase();
  const prazoDias = prazo.match(/^D\+(\d+)$/);
  const dataBase = parseDataLocal(input.dataBase);
  const dataLimite = prazoDias && dataBase
    ? new Date(dataBase.getFullYear(), dataBase.getMonth(), dataBase.getDate() + Number(prazoDias[1]))
    : parseDataLocal(prazo);
  const hoje = parseDataLocal(input.hoje || new Date());

  return Boolean(dataLimite && hoje && dataLimite.getTime() < hoje.getTime());
}

export function buscarPrazoDaRota(
  destino: DestinoPedido,
  rotas: RotaPrazoEntrega[]
): string | null {
  const bairro = normalizar(destino.bairro);
  const cidade = normalizar(destino.cidade);
  const uf = extrairUf(destino.uf);
  const transportadora = normalizar(destino.transportadora);

  const candidatas = rotas.flatMap((rota) => {
    if (rota.ativo === false) return [];
    const ufRota = extrairUf(rota.uf);
    if (uf && ufRota && uf !== ufRota) return [];

    const local = localDaRota(rota.codigo);
    const pontuacaoBairro = rotaContidaNoDestino(bairro, local)
      ? bairro === local ? 300 : 200
      : 0;
    const pontuacaoCidade = rotaContidaNoDestino(cidade, local)
      ? cidade === local ? 100 : 50
      : 0;
    const pontuacao = Math.max(pontuacaoBairro, pontuacaoCidade);
    return pontuacao > 0 ? [{ rota, pontuacao }] : [];
  });

  if (!candidatas.length) return null;
  const melhorPontuacao = Math.max(...candidatas.map((item) => item.pontuacao));
  let melhores = candidatas.filter((item) => item.pontuacao === melhorPontuacao);

  if (transportadora) {
    const porTransportadora = melhores.filter(({ rota }) => {
      const nomeRota = normalizar(rota.transportadora);
      return nomeRota === transportadora || nomeRota.includes(transportadora) || transportadora.includes(nomeRota);
    });
    if (porTransportadora.length) melhores = porTransportadora;
  }

  const prazos = new Set(melhores.map(({ rota }) => normalizar(rota.prazo)));
  return prazos.size === 1 ? melhores[0].rota.prazo : null;
}