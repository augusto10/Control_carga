import { create } from 'zustand';
import { useSnackbar } from 'notistack';

export type NotaFiscal = {
  id: string;
  dataCriacao: Date;
  codigo: string;
  numeroNota: string;
  valor: number;
  controleId: string | null;
};

export type ControleCarga = {
  id: string;
  dataCriacao: Date;
  motorista: string;
  cpfMotorista: string;
  responsavel: string;
  transportadora: 'ACERT' | 'EXPRESSO_GOIAS';
  numeroManifesto: string;
  qtdPallets: number;
  observacao?: string;
  finalizado: boolean;
  notas: NotaFiscal[];
};

interface StoreState {
  notas: NotaFiscal[];
  controles: ControleCarga[];
  status: 'success' | 'error' | null;
  fetchNotas: (start?: string, end?: string) => Promise<void>;
  fetchControles: () => Promise<void>;
  addNota: (nota: Omit<NotaFiscal, 'id' | 'dataCriacao' | 'controleId'>) => Promise<NotaFiscal>;
  criarControle: (controle: Omit<ControleCarga, 'id' | 'dataCriacao' | 'finalizado' | 'notas'> & { notasIds: string[] }) => Promise<ControleCarga>;
  vincularNotas: (controleId: string, notasIds: string[]) => Promise<void>;
  finalizarControle: (controleId: string) => Promise<void>;
  atualizarControle: (controleId: string, dados: Partial<Omit<ControleCarga, 'id' | 'dataCriacao' | 'notas'>>) => Promise<ControleCarga | null>;
}

export const useStore = create<StoreState>((set) => ({
  notas: [],
  controles: [],
  status: null,

  fetchNotas: async (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const response = await fetch(`/api/notas${params.toString() ? '?' + params.toString() : ''}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    const notas = await response.json();
    set({ notas });
  },

  fetchControles: async () => {
    console.log('Iniciando fetchControles...');
    try {
      const response = await fetch('/api/controles', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('Resposta do fetchControles recebida, status:', response.status);
      
      if (!response.ok) {
        console.error('Erro ao buscar controles:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Detalhes do erro:', errorData);
        throw new Error(errorData.error || 'Erro ao buscar controles');
      }
      
      const controles = await response.json();
      console.log('Controles carregados com sucesso, quantidade:', controles.length);
      set({ controles });
    } catch (error) {
      console.error('Erro em fetchControles:', error);
      throw error;
    }
  },

  addNota: async (nota) => {
    try {
      console.log('Dados sendo enviados:', nota);
      const response = await fetch('/api/addNota', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nota),
      });
      
      console.log('Status da resposta:', response.status);
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Detalhes do erro:', errorData);
        throw new Error(`Erro ao salvar nota: ${response.status} - ${errorData}`);
      }
      
      const newNota = await response.json();
      
      set((state) => ({
        notas: [...state.notas, newNota],
        status: 'success'
      }));
      
      return newNota;
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      set((state) => ({
        ...state,
        status: 'error'
      }));
      throw error;
    }
  },

  criarControle: async (controle) => {
    try {
      console.log('Enviando requisição para criar controle com notas:', controle);
      
      const response = await fetch('/api/controles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(controle),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao criar controle');
      }

      const novoControle = await response.json();
      
      // Se houver notas para vincular, faz o vínculo
      if (controle.notasIds && controle.notasIds.length > 0) {
        try {
          await fetch('/api/controles/vincular-notas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              controleId: novoControle.id,
              notasIds: controle.notasIds
            }),
          });
          
          // Atualiza o controle com as notas vinculadas
          novoControle.notas = controle.notasIds.map((id: string) => ({
            id,
            // Adicione outros campos necessários da nota aqui
          }));
          
        } catch (error) {
          console.error('Erro ao vincular notas:', error);
          // Não lança o erro para não interromper o fluxo, apenas loga
        }
      }
      
      // Atualiza a lista de controles
      const controles = await (await fetch('/api/controles')).json();
      set({ controles });
      
      return novoControle;
    } catch (error) {
      console.error('Erro na função criarControle:', error);
      throw error;
    }
  },

  vincularNotas: async (controleId, notasIds) => {
    await fetch('/api/controles/vincular-notas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ controleId, notasIds }),
    });
    
    await Promise.all([
      useStore.getState().fetchNotas(),
      useStore.getState().fetchControles(),
    ]);
  },

  finalizarControle: async (controleId) => {
    await fetch('/api/controles/finalizar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ controleId }),
    });
    
    await useStore.getState().fetchControles();
  },

  atualizarControle: async (controleId, dados): Promise<ControleCarga | null> => {
    console.log('Iniciando atualizarControle...');
    try {
      console.log('Enviando requisição para /api/controles/atualizar com dados:', {
        controleId,
        ...dados,
        qtdPallets: Number(dados.qtdPallets) || 0
      });
      
      const response = await fetch('/api/controles/atualizar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ 
          controleId, 
          ...dados,
          // Garante que qtdPallets seja um número
          qtdPallets: Number(dados.qtdPallets) || 0
        }),
      });

      console.log('Resposta recebida, status:', response.status);
      
      if (!response.ok) {
        console.error('Erro na resposta da API:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Detalhes do erro:', errorData);
        throw new Error(errorData.error || 'Erro ao atualizar controle');
      }
      
      // Atualiza a lista de controles após a atualização
      console.log('Atualizando lista de controles...');
      const result = await response.json();
      await useStore.getState().fetchControles();
      console.log('Controle atualizado com sucesso:', result);
      return result as ControleCarga;
      
    } catch (error) {
      console.error('Erro ao atualizar controle:', error);
      return null;
    }
  },
}));
