import api from './api';

export interface ValidacaoResponse {
  message: string;
}

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
    // Garante que o erro lançado tenha uma propriedade 'message'
    throw new Error(error.response?.data?.message || 'Não foi possível validar o pedido.');
  }
};
