import { create } from 'zustand';
import { useSnackbar } from 'notistack';
import { api } from '../services/api';
import { removerNotasTransferidas } from '@/lib/controles/notas-direcionamento';

export type ControleResumido = {
  id: string;
  numeroManifesto: string | null;
  motorista: string;
  responsavel: string;
  transportadora: string;
  dataCriacao: Date;
};

export type TransportadoraDestino =
  | 'ACERT'
  | 'ACCERT'
  | 'EXPRESSO_GOIAS'
  | 'TERCEIRIZADA'
  | 'DETAFRA_TRANSPORTES'
  | 'RETIRA_VENDEDOR'
  | 'RETIRA_CLIENTE'
  | 'VLOG'
  | 'ZANUELO_TRANSPORTE_LOGISTICA';

export type NotaFiscal = {
  id: string;
  dataCriacao: Date;
  codigo: string;
  numeroNota: string;
  volumes: string;
  controleId: string | null;
  transportadoraDestino?: TransportadoraDestino | null;
  controle?: ControleResumido | null;
};

export type Transportadora = {
  id: string;
  nome: string;
  descricao: string;
};

export type ControleCarga = {
  id: string;
  dataCriacao: Date;
  motorista: string;
  cpfMotorista: string;
  responsavel: string;
  transportadora: TransportadoraDestino;
  numeroManifesto: string | null;
  qtdPallets: number;
  observacao: string | null;
  finalizado: boolean;
  notas: NotaFiscal[];
  freteInformado?: boolean;
  valorFrete?: number | null;
  imagens?: string[];
  assinaturaMotorista?: string | null;
  assinaturaResponsavel?: string | null;
  dataAssinaturaMotorista?: Date | null;
  dataAssinaturaResponsavel?: Date | null;
};

interface StoreState {
  notas: NotaFiscal[];
  controles: ControleCarga[];
  transportadoras: Transportadora[];
  status: 'success' | 'error' | null;
  loading: boolean;
  fetchNotas: (start?: string, end?: string, numeroNota?: string, codigo?: string) => Promise<void>;
  fetchNotasDisponiveis: (filters?: {
    transportadoraDestino?: TransportadoraDestino;
    semTransportadora?: boolean;
  }) => Promise<NotaFiscal[]>;
  transferirNotas: (
    notaIds: string[],
    destino: TransportadoraDestino
  ) => Promise<{ count: number; ids: string[] }>;
  fetchControles: (filters?: {
    start?: string;
    end?: string;
    transportadora?: string;
    notaFiscal?: string;
    motorista?: string;
    responsavel?: string;
    limit?: number;
  }) => Promise<void>;
  fetchTransportadoras: () => Promise<void>;
  addNota: (nota: Omit<NotaFiscal, 'id' | 'dataCriacao' | 'controleId'>) => Promise<NotaFiscal>;
  criarControle: (controle: Omit<ControleCarga, 'id' | 'dataCriacao' | 'finalizado' | 'notas'> & { notasIds?: string[] }) => Promise<ControleCarga>;
  vincularNotas: (controleId: string, notasIds: string[]) => Promise<void>;
  finalizarControle: (controleId: string) => Promise<void>;
  excluirControle: (controleId: string) => Promise<void>;
  atualizarControle: (controleId: string, dados: Partial<Omit<ControleCarga, 'id' | 'dataCriacao' | 'notas'>> & { notasIds?: string[] }) => Promise<ControleCarga | null>;
  deleteNota: (notaId: string) => Promise<boolean>;
}

export const useStore = create<StoreState>((set) => ({
  notas: [],
  controles: [],
  transportadoras: [],
  status: null,
  loading: false,

  fetchNotas: async (start?: string, end?: string, numeroNota?: string, codigo?: string) => {
    console.log('[fetchNotas] Iniciando busca de notas');
    console.log('[fetchNotas] Parâmetros:', { start, end, numeroNota, codigo });
    
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    if (numeroNota) params.append('numeroNota', numeroNota);
    if (codigo) params.append('codigo', codigo);
    
    const url = `/api/notas${params.toString() ? '?' + params.toString() : ''}`;
    console.log('[fetchNotas] URL da requisição:', url);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json'
        },
        credentials: 'include' // Inclui cookies na requisição
      });
      
      console.log('[fetchNotas] Resposta recebida, status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[fetchNotas] Erro na resposta:', errorText);
        throw new Error('Erro ao carregar notas');
      }
      
      const notas = await response.json();
      console.log(`[fetchNotas] ${notas.length} notas carregadas`);
      set({ notas });
      
    } catch (error) {
      console.error('[fetchNotas] Erro ao buscar notas:', error);
      throw error;
    }
  },

  fetchNotasDisponiveis: async (filters = {}) => {
    const params = new URLSearchParams({ disponiveis: '1' });
    if (filters.transportadoraDestino) {
      params.set('transportadoraDestino', filters.transportadoraDestino);
    }
    if (filters.semTransportadora) params.set('semTransportadora', '1');

    const response = await fetch(`/api/notas?${params.toString()}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao buscar notas disponíveis');
    }

    const notas = await response.json() as NotaFiscal[];
    set({ notas });
    return notas;
  },

  transferirNotas: async (notaIds, destino) => {
    const response = await fetch('/api/notas/transferir', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notaIds, transportadoraDestino: destino }),
    });

    const result = await response.json() as { count: number; ids: string[]; message?: string };
    if (!response.ok) {
      throw new Error(result.message || 'Erro ao transferir notas');
    }

    set((state) => ({
      notas: removerNotasTransferidas(state.notas, result.ids),
    }));
    return { count: result.count, ids: result.ids };
  },

  fetchControles: async (filters = {}) => {
    console.log('Iniciando fetchControles com filtros:', filters);
    set({ loading: true });
    try {
      // Construir query string com filtros
      const params = new URLSearchParams();
      if (filters.start) params.append('start', filters.start);
      if (filters.end) params.append('end', filters.end);
      if (filters.transportadora) params.append('transportadora', filters.transportadora);
      if (filters.notaFiscal) params.append('notaFiscal', filters.notaFiscal);
      if (filters.motorista) params.append('motorista', filters.motorista);
      if (filters.responsavel) params.append('responsavel', filters.responsavel);
      if (filters.limit) params.append('limit', filters.limit.toString());
      
      const url = `/api/controles${params.toString() ? '?' + params.toString() : ''}`;
      console.log('URL da requisição:', url);
      
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });
      
      console.log('Resposta do fetchControles recebida, status:', response.status);
      
      if (!response.ok) {
        console.error('Erro ao buscar controles:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Detalhes do erro:', errorData);
        throw new Error(errorData.message || errorData.error || 'Erro ao buscar controles');
      }
      
      const controles = await response.json();
      console.log('Controles carregados com sucesso, quantidade:', controles.length);
      set({ controles, loading: false });
    } catch (error) {
      console.error('Erro em fetchControles:', error);
      set({ loading: false });
      throw error;
    }
  },
  
  fetchTransportadoras: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/transportadoras', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao buscar transportadoras');
      }
      
      const transportadoras = await response.json();
      set({ transportadoras, loading: false });
      return transportadoras;
    } catch (error) {
      console.error('Erro ao buscar transportadoras:', error);
      set({ loading: false });
      throw error;
    }
  },

  addNota: async (nota) => {
    try {
      console.log('Dados sendo enviados:', nota);
      
      // Verifica se o usuário está autenticado antes de tentar salvar
      const authCheck = await fetch('/api/auth/me', {
        credentials: 'include'
      });
      
      if (!authCheck.ok) {
        throw new Error('Usuário não autenticado');
      }
      
      const response = await fetch('/api/addNota', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include', // Importante para enviar cookies de autenticação
        body: JSON.stringify(nota),
      });
      
      console.log('Status da resposta:', response.status);
      
      // Se for erro 401, força o logout
      if (response.status === 401) {
        window.dispatchEvent(new Event('unauthorized'));
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
      }
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Detalhes do erro:', errorData);
        } catch (e) {
          errorData = await response.text();
        }
        
        const errorMessage = typeof errorData === 'object' 
          ? errorData.error || errorData.message || 'Erro desconhecido'
          : errorData || 'Erro ao processar a requisição';
        
        throw new Error(`Erro ao salvar nota: ${response.status} - ${errorMessage}`);
      }
      
      const newNota = await response.json();
      
      set((state) => ({
        notas: [...state.notas, newNota],
        status: 'success'
      }));
      
      return newNota;
    } catch (error: any) {
      console.error('Erro ao adicionar nota:', error);
      set((state) => ({
        ...state,
        status: 'error'
      }));
      
      // Se for erro de autenticação, redireciona para o login
      if (error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
        window.dispatchEvent(new Event('unauthorized'));
      }
      
      throw error;
    }
  },

  criarControle: async (controle) => {
    try {
      console.log('[criarControle] Dados recebidos:', JSON.stringify(controle, null, 2));
      
      // Validação dos dados obrigatórios
      if (!controle.motorista?.trim()) {
        throw new Error('Nome do motorista é obrigatório');
      }
      if (!controle.responsavel?.trim()) {
        throw new Error('Nome do responsável é obrigatório');
      }
      
      console.log('[criarControle] Transportadora recebida:', controle.transportadora);
      
      if (!['ACERT', 'ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE', 'VLOG', 'ZANUELO_TRANSPORTE_LOGISTICA'].includes(controle.transportadora)) {
        console.error('[criarControle] Transportadora inválida:', controle.transportadora);
        throw new Error('Transportadora inválida. Valor recebido: ' + controle.transportadora);
      }

      // Garante que notasIds seja um array
      const notasIds = Array.isArray(controle.notasIds) ? controle.notasIds : [];

      // Prepara os dados para envio
      const dadosEnvio = {
        ...controle,
        motorista: controle.motorista.trim(),
        responsavel: controle.responsavel.trim(),
        cpfMotorista: controle.cpfMotorista ? controle.cpfMotorista.replace(/[^\d]/g, '') : 'PENDENTE',
        qtdPallets: Number(controle.qtdPallets) || 0,
        observacao: controle.observacao || null,
        notasIds: notasIds
      };

      console.log('[criarControle] Dados formatados para envio:', JSON.stringify(dadosEnvio, null, 2));
      
      console.log('[criarControle] Enviando requisição para /api/controles');
      
      const response = await fetch('/api/controles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dadosEnvio),
      });

      console.log('[criarControle] Resposta recebida. Status:', response.status);
      
      let responseData;
      try {
        responseData = await response.json();
        console.log('[criarControle] Corpo da resposta:', JSON.stringify(responseData, null, 2));
      } catch (error) {
        console.error('[criarControle] Erro ao fazer parse da resposta:', error);
        responseData = {};
      }

      if (!response.ok) {
        console.error('[criarControle] Erro na resposta da API. Status:', response.status);
        console.error('[criarControle] Dados do erro:', responseData);
        
        const errorMessage = responseData.error || 
                            responseData.message || 
                            `Erro ao criar controle: ${response.status} ${response.statusText}`;
                            
        console.error('[criarControle] Mensagem de erro:', errorMessage);
        throw new Error(errorMessage);
      }

      const novoControle = responseData;
      
      // Atualiza a lista de controles
      try {
        const controlesResponse = await fetch('/api/controles', {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        if (controlesResponse.ok) {
          const controles = await controlesResponse.json();
          set({ controles });
        }
      } catch (updateError) {
        console.error('Erro ao atualizar lista de controles:', updateError);
      }
      
      return novoControle;
    } catch (error) {
      console.error('Erro na função criarControle:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro desconhecido ao criar controle');
    }
  },

  vincularNotas: async (controleId, notasIds) => {
    const response = await fetch('/api/controles/vincular-notas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ controleId, notasIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao vincular notas');
    }
    
    await Promise.all([
      useStore.getState().fetchNotas(),
      useStore.getState().fetchControles(),
    ]);
  },

  excluirControle: async (controleId) => {
    const response = await fetch(`/api/controles/${controleId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Erro ao excluir controle');
    }
    set((state) => ({
      controles: state.controles.filter((controle) => controle.id !== controleId),
      notas: state.notas.map((nota) => nota.controleId === controleId
        ? { ...nota, controleId: null, controle: null }
        : nota),
    }));
  },

  finalizarControle: async (controleId) => {
    try {
      const response = await fetch(`/api/controles/${controleId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ finalizado: true }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao finalizar controle');
      }
      
      const updatedControle = await response.json() as ControleCarga;
      set((state) => ({
        controles: state.controles.map((controle) =>
          controle.id === controleId ? { ...controle, ...updatedControle } : controle
        ),
      }));
    } catch (error) {
      console.error('Erro ao finalizar controle:', error);
      throw error;
    }
  },

  atualizarControle: async (controleId, dados): Promise<ControleCarga | null> => {
    console.log('Iniciando atualizarControle...');
    try {
      const isCriacao = !controleId;
      const url = isCriacao ? '/api/controles' : `/api/controles/${controleId}`;
      const method = isCriacao ? 'POST' : 'PUT';
      const payload = {
        ...dados,
        qtdPallets: Number(dados.qtdPallets) || 0
      };

      console.log(`Enviando requisi????o ${method} para ${url} com dados:`, {
        controleId,
        ...payload
      });

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      console.log('Resposta recebida, status:', response.status);

      if (!response.ok) {
        console.error('Erro na resposta da API:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('Detalhes do erro:', errorData);
        throw new Error(errorData.message || errorData.error || 'Erro ao atualizar controle');
      }

      const result = await response.json();

      set((state) => {
        if (isCriacao) {
          return {
            controles: [result, ...state.controles]
          };
        }

        return {
          controles: state.controles.map((controle) =>
            controle.id === controleId ? result : controle
          )
        };
      });

      console.log('Controle atualizado com sucesso:', result);
      return result as ControleCarga;

    } catch (error) {
      console.error('Erro ao atualizar controle:', error);
      throw error;
    }
  },

  deleteNota: async (notaId: string): Promise<boolean> => {
    console.log(`[deleteNota] Iniciando exclusão da nota ${notaId}`);
    
    try {
      // Usando a instância do Axios configurada
      console.log(`[deleteNota] Iniciando requisição DELETE para /api/notas/${notaId}`);
      
      // Corrigido para usar DELETE na rota correta
      const response = await api.delete(`/api/notas/${notaId}`);
      
      console.log(`[deleteNota] Resposta recebida:`, {
        status: response.status,
        data: response.data
      });
      
      // Remove a nota do estado local
      console.log(`[deleteNota] Removendo nota ${notaId} do estado local`);
      set((state) => ({
        notas: state.notas.filter((nota) => {
          const shouldKeep = nota.id !== notaId;
          if (!shouldKeep) {
            console.log(`[deleteNota] Nota ${notaId} removida do estado`);
          }
          return shouldKeep;
        })
      }));

      console.log(`[deleteNota] Nota ${notaId} excluída com sucesso`);
      return true;
      
    } catch (error: any) {
      console.error('[deleteNota] Erro ao excluir nota:', error);
      
      let errorMessage = 'Erro ao excluir nota. Tente novamente.';
      
      if (error.response) {
        // A requisição foi feita e o servidor respondeu com um status fora do intervalo 2xx
        console.error('[deleteNota] Erro na resposta:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        
        if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.status === 401) {
          errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
        } else if (error.response.status === 403) {
          errorMessage = 'Você não tem permissão para excluir esta nota.';
        } else if (error.response.status === 404) {
          errorMessage = 'Nota não encontrada.';
        }
      } else if (error.request) {
        // A requisição foi feita mas não houve resposta
        console.error('[deleteNota] Sem resposta do servidor:', error.request);
        errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão de internet.';
      } else {
        // Algo aconteceu ao configurar a requisição
        console.error('[deleteNota] Erro ao configurar a requisição:', error.message);
        errorMessage = `Erro ao processar a requisição: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  },
}));
