export type FreteDfOrigem = 'referencia_publica' | 'inferencia_operacional';

export interface FreteDfEstimado {
  regiao: string;
  valor: number | null;
  origem: FreteDfOrigem;
  descricao: string;
  observacao: string;
}

type RegraFrete = {
  regiao: string;
  valor: number;
  origem: FreteDfOrigem;
  descricao: string;
  aliases: string[];
};

const REGRAS_FRETE_DF: RegraFrete[] = [
  {
    regiao: 'Sobradinho / Sobradinho II',
    valor: 12,
    origem: 'referencia_publica',
    descricao: 'Faixa local',
    aliases: ['SOBRADINHO', 'SOBRADINHO I', 'SOBRADINHO II'],
  },
  {
    regiao: 'Taquari / Via do Torto / Nova Colina',
    valor: 18,
    origem: 'referencia_publica',
    descricao: 'Faixa próxima ao CD',
    aliases: ['TAQUARI', 'VIA DO TORTO', 'NOVA COLINA', 'GRANDE COLORADO'],
  },
  {
    regiao: 'Asa Norte / Noroeste / Lago Norte / Varjão / Planaltina',
    valor: 28,
    origem: 'referencia_publica',
    descricao: 'Faixa norte',
    aliases: [
      'ASA NORTE',
      'NORTE',
      'NOROESTE',
      'LAGO NORTE',
      'VARJAO',
      'VARJÃO',
      'PLANALTINA',
    ],
  },
  {
    regiao: 'Asa Sul / Lago Sul / Paranoá / Guará / Cruzeiro / Sudoeste / SIA',
    valor: 41,
    origem: 'referencia_publica',
    descricao: 'Faixa central/sul',
    aliases: [
      'ASA SUL',
      'LAGO SUL',
      'PARANOA',
      'PARANOÁ',
      'VILA PLANALTO',
      'GUARA',
      'GUARÁ',
      'CRUZEIRO',
      'SUDOESTE',
      'OCTOGONAL',
      'PARK WAY',
      'PARK SUL',
      'SIA',
      'CANDANGOLANDIA',
      'CANDANGOLÂNDIA',
      'RIACHO FUNDO',
      'RIACHO FUNDO I',
      'RIACHO FUNDO II',
      'SCIA',
      'ESTRUTURAL',
    ],
  },
  {
    regiao: 'Jardim Botânico / Taguatinga / Águas Claras / Ceilândia / Vicente Pires',
    valor: 50,
    origem: 'referencia_publica',
    descricao: 'Faixa expandida',
    aliases: [
      'JARDIM BOTANICO',
      'JARDIM BOTÂNICO',
      'MANGUEIRAL',
      'TAGUATINGA',
      'TAGUATINGA NORTE',
      'TAGUATINGA SUL',
      'AGUAS CLARAS',
      'ÁGUAS CLARAS',
      'CEILANDIA',
      'CEILÂNDIA',
      'NUCLEO BANDEIRANTE',
      'NÚCLEO BANDEIRANTE',
      'VICENTE PIRES',
      'ARNIQUEIRA',
    ],
  },
  {
    regiao: 'Gama / Samambaia',
    valor: 60,
    origem: 'referencia_publica',
    descricao: 'Faixa longa',
    aliases: ['GAMA', 'SAMAMBAIA'],
  },
  {
    regiao: 'Demais regiões do DF',
    valor: 60,
    origem: 'inferencia_operacional',
    descricao: 'Estimativa provisória para regiões ainda não tabeladas',
    aliases: [
      'SANTA MARIA',
      'RECANTO DAS EMAS',
      'SAO SEBASTIAO',
      'SÃO SEBASTIÃO',
      'ITAPOA',
      'ITAPOÃ',
      'BRAZLANDIA',
      'BRAZLÂNDIA',
      'FERCAL',
    ],
  },
];

const TODOS_ALIASES_DF = REGRAS_FRETE_DF.flatMap((regra) => regra.aliases);

function normalize(value?: string | null): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function containsAlias(textos: string[], aliases: string[]): boolean {
  return aliases.some((alias) => textos.some((texto) => texto.includes(alias)));
}

export function estimarFreteDfPorRegiao(input: {
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  endereco?: string | null;
}): FreteDfEstimado {
  const bairro = normalize(input.bairro);
  const cidade = normalize(input.cidade);
  const estado = normalize(input.estado);
  const endereco = normalize(input.endereco);

  const textos = [bairro, cidade, endereco].filter(Boolean);
  const isDf =
    estado === 'DF' ||
    cidade === 'BRASILIA' ||
    cidade === 'BRASILIA - DF' ||
    containsAlias(textos, TODOS_ALIASES_DF);

  if (!isDf) {
    return {
      regiao: 'Fora do DF',
      valor: null,
      origem: 'inferencia_operacional',
      descricao: 'Sem regra local',
      observacao: 'Frete de referência disponível apenas para regiões do DF.',
    };
  }

  const regra = REGRAS_FRETE_DF.find((item) => containsAlias(textos, item.aliases));

  if (regra) {
    return {
      regiao: regra.regiao,
      valor: regra.valor,
      origem: regra.origem,
      descricao: regra.descricao,
      observacao:
        regra.origem === 'referencia_publica'
          ? 'Frete de referência temporário por região do DF.'
          : 'Estimativa provisória até a tabela interna de fretes ser implantada.',
    };
  }

  return {
    regiao: 'Região do DF não mapeada',
    valor: 60,
    origem: 'inferencia_operacional',
    descricao: 'Fallback provisório',
    observacao: 'Região ainda sem tabela dedicada; usando faixa provisória mais conservadora.',
  };
}

export const FRETE_DF_FONTE_REFERENCIA = {
  nome: 'Boxtoyou - Formas de Entrega',
  url: 'https://boxtoyou.com.br/formas-de-entrega/',
  observadoEm: '2026-05-12',
};
