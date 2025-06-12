import { create } from 'zustand';
import { useSnackbar } from 'notistack';

type NotaFiscal = {
  id: string;
  dataCriacao: Date;
  codigo: string;
  numeroNota: string;
  valor: number;
  controleId: string | null;
};

type ControleCarga = {
  id: string;
  dataCriacao: Date;
  motorista: string;
  responsavel: string;
  finalizado: boolean;
  notas: NotaFiscal[];
};

interface StoreState {
  notas: NotaFiscal[];
  controles: ControleCarga[];
  status: 'success' | 'error' | null;
  fetchNotas: () => Promise<void>;
  fetchControles: () => Promise<void>;
  addNota: (nota: Omit<NotaFiscal, 'id' | 'dataCriacao' | 'controleId'>) => Promise<NotaFiscal>;
  criarControle: (controle: Omit<ControleCarga, 'id' | 'dataCriacao' | 'finalizado' | 'notas'>) => Promise<ControleCarga>;
  vincularNotas: (controleId: string, notasIds: string[]) => Promise<void>;
  finalizarControle: (controleId: string) => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  notas: [],
  controles: [],
  status: null,

  fetchNotas: async () => {
    const response = await fetch('/api/notas');
    const notas = await response.json();
    set({ notas });
  },

  fetchControles: async () => {
    const response = await fetch('/api/controles');
    const controles = await response.json();
    set({ controles });
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
    const response = await fetch('/api/controles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(controle),
    });
    
    if (!response.ok) {
      throw new Error('Erro ao criar controle');
    }
    
    const newControle = await response.json();
    
    set((state) => ({ controles: [...state.controles, { ...newControle, notas: [] }] }));
    return { ...newControle, notas: [] };
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
}));
