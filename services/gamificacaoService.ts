import api from './api';

export interface ValidacaoResponse {
  message: string;
}

export interface PontuacaoResponse {
  usuarioId: string;
  pontuacaoTotal: number;
  pedidosCorretos: number;
  pedidosIncorretos: number;
  posicaoRanking: number;
}

export interface RankingResponse {
  posicao: number;
  usuario: {
    id: string;
    nome: string;
    foto?: string;
    tipo: string;
  };
  pontuacaoTotal: number;
  pedidosCorretos: number;
  pedidosIncorretos: number;
}

export interface HistoricoPontuacao {
  id: string;
  usuarioId: string;
  pedidoId?: string;
  acao: string;
  pontosGanhos: number;
  descricao?: string;
  dataAcao: string;
}

// Pontuação base para diferentes ações
export const PONTUACAO_CONFIG = {
  PEDIDO_CORRETO: 10,
  PEDIDO_INCORRETO: -5,
  BONUS_ADMIN: 20,
  PENALIDADE_ADMIN: -10,
};

// Funções de gamificação

export const validarPedido = async (
  pedidoConferidoId: string,
  status: 'VALIDADO_CORRETO' | 'VALIDADO_INCORRETO'
): Promise<ValidacaoResponse> => {
  try {
    const response = await api.post<ValidacaoResponse>('/gamificacao/validar-pedido', {
      pedidoConferidoId,
      status,
    });
    return response.data;
  } catch (error: any) {
    console.error('Erro ao validar pedido:', error);
    throw new Error(error.response?.data?.message || 'Não foi possível validar o pedido.');
  }
};

// Obter pontuação do usuário autenticado
export const obterMinhaPontuacao = async (): Promise<PontuacaoResponse> => {
  try {
    const response = await api.get<PontuacaoResponse>('/gamificacao/minha-pontuacao');
    return response.data;
  } catch (error: any) {
    console.error('Erro ao obter pontuação:', error);
    throw new Error(error.response?.data?.message || 'Não foi possível obter pontuação.');
  }
};

// Obter ranking geral
export const obterRanking = async (): Promise<RankingResponse[]> => {
  try {
    const response = await api.get<RankingResponse[]>('/gamificacao/ranking');
    return response.data;
  } catch (error: any) {
    console.error('Erro ao obter ranking:', error);
    throw new Error(error.response?.data?.message || 'Não foi possível obter ranking.');
  }
};

// Obter histórico de pontuação do usuário
export const obterHistoricoPontuacao = async (): Promise<HistoricoPontuacao[]> => {
  try {
    const response = await api.get<HistoricoPontuacao[]>('/gamificacao/historico');
    return response.data;
  } catch (error: any) {
    console.error('Erro ao obter histórico:', error);
    throw new Error(error.response?.data?.message || 'Não foi possível obter histórico.');
  }
};

// Adicionar pontos manualmente (para administradores)
export const adicionarPontos = async (
  usuarioId: string,
  pontos: number,
  descricao: string,
  acao: 'BONUS_ADMIN' | 'PENALIDADE_ADMIN' = 'BONUS_ADMIN'
): Promise<ValidacaoResponse> => {
  try {
    const response = await api.post<ValidacaoResponse>('/gamificacao/adicionar-pontos', {
      usuarioId,
      pontos,
      descricao,
      acao,
    });
    return response.data;
  } catch (error: any) {
    console.error('Erro ao adicionar pontos:', error);
    throw new Error(error.response?.data?.message || 'Não foi possível adicionar pontos.');
  }
};

// Resetar pontuação (para administradores)
export const resetarPontuacao = async (usuarioId: string): Promise<ValidacaoResponse> => {
  try {
    const response = await api.post<ValidacaoResponse>(`/gamificacao/resetar/${usuarioId}`);
    return response.data;
  } catch (error: any) {
    console.error('Erro ao resetar pontuação:', error);
    throw new Error(error.response?.data?.message || 'Não foi possível resetar pontuação.');
  }
};
