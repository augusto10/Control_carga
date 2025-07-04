import { create } from 'zustand';

// Tipos
export interface NotaFiscal {
  id: string;
  numeroNota: string;
  codigo: string;
  emitente: string;
  destinatario: string;
  valor: number;
  peso: number;
  status: string;
  controleId?: string | null;
}

export interface ControleCarga {
  id: string;
  numeroManifesto: number | null;
  motorista: string;
  cpfMotorista: string | null;
  transportadora: string;
  responsavel: string;
  qtdPallets: number;
  observacao: string | null;
  finalizado: boolean;
  dataCriacao: string;
  notas: NotaFiscal[];
}

// Estado da Store
interface StoreState {
  controles: ControleCarga[];
  notas: NotaFiscal[];
  loading: boolean;
  error: string | null;
  fetchControles: () => Promise<void>;
  fetchNotas: () => Promise<void>;
  criarControle: (controle: Omit<ControleCarga, 'id' | 'dataCriacao' | 'finalizado' | 'notas'> & { notasIds?: string[] }) => Promise<ControleCarga>;
  vincularNotas: (controleId: string, notasIds: string[]) => Promise<void>;
  finalizarControle: (controleId: string) => Promise<void>;
  atualizarControle: (controleId: string, dados: Partial<Omit<ControleCarga, 'id' | 'dataCriacao'>>) => Promise<ControleCarga | null>;
  deletarControle: (controleId: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  controles: [],
  notas: [],
  loading: false,
  error: null,

  fetchControles: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/controles');
      if (!response.ok) throw new Error('Falha ao buscar controles');
      const data = await response.json();
      set({ controles: data, loading: false, error: null });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchNotas: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/notas');
      if (!response.ok) throw new Error('Falha ao buscar notas fiscais');
      const data = await response.json();
      set({ notas: data, loading: false, error: null });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  criarControle: async (controle) => {
    const response = await fetch('/api/controles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(controle),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Falha ao criar controle');
    }
    const novoControle = await response.json();
    await get().fetchControles();
    return novoControle;
  },

  vincularNotas: async (controleId, notasIds) => {
    await fetch('/api/controles/vincular-notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ controleId, notasIds }),
    });
    await get().fetchControles();
    await get().fetchNotas();
  },

  finalizarControle: async (controleId) => {
    await fetch('/api/controles/finalizar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ controleId }),
    });
    await get().fetchControles();
  },

  atualizarControle: async (controleId, dados) => {
    try {
      const response = await fetch('/api/controles/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controleId, ...dados }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao atualizar controle');
      }
      const data = await response.json();
      await get().fetchControles();
      return data;
    } catch (error) {
      console.error('Erro ao atualizar controle:', error);
      return null;
    }
  },

  deletarControle: async (controleId: string) => {
    try {
      const response = await fetch('/api/controles/deletar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controleId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Falha ao excluir controle');
      }
      await get().fetchControles();
    } catch (error) {
      console.error('Erro ao excluir controle:', error);
      throw error;
    }
  },
}));
