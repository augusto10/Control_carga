import axios, { AxiosInstance } from 'axios';

const API_EXTERNA_BASE = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';

interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

interface NotaFiscalExterna {
  id?: string;
  numero: string;
  serie: string;
  chave?: string;
  dataEmissao?: string;
  valor?: number;
  cliente?: {
    id?: string;
    nome?: string;
    cnpj?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    bairro?: string;
  };
  volumes?: number;
  peso?: number;
  observacoes?: string;
}

interface ClienteExterna {
  id?: string;
  nome?: string;
  cnpj?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  bairro?: string;
}

interface PedidoExterno {
  ID?: number;
  NUMERO_PEDIDO?: string;
  NOME_RAZAO_SOCIAL?: string;
  NOME_FANTASIA?: string;
  CNPJ?: string;
  CPF?: string;
  LOGRADOURO?: string;
  NUMERO?: string;
  COMPLEMENTO?: string;
  BAIRRO?: string;
  CIDADE?: string;
  UF?: string;
  CEP?: string;
  VALOR_TOTAL?: number;
  [key: string]: any;
}

interface ApuracaoExterna {
  ORCAMENTO_BASE_ID?: number;
  NUMERO_NOTA?: string;
  NOTA_FISCAL_ID?: number;
  IDENTIFICACAO_NFE?: string;
  DATA_EMISSAO?: string;
  [key: string]: any;
}

class APIExternaService {
  private apiInstance: AxiosInstance;
  private token: string | null = null;
  private tokenExpiration: number | null = null;

  constructor() {
    this.apiInstance = axios.create({
      baseURL: API_EXTERNA_BASE,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 segundos de timeout
    });

    this.apiInstance.interceptors.request.use(
      (config) => {
        if (this.token && config.url !== '/token') {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.apiInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && error.config?.url !== '/token') {
          console.log('[API Externa] Token expirado, renovando...');
          this.token = null;
          this.tokenExpiration = null;
          return Promise.reject(error);
        }
        return Promise.reject(error);
      }
    );
  }

  async login(username: string, password: string): Promise<string | null> {
    try {
      console.log('[API Externa] Tentando login com username:', username);
      
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);
      params.append('grant_type', 'password');

      const response = await axios.post<LoginResponse>(
        `${API_EXTERNA_BASE}/token`,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.token = response.data.access_token;
      
      if (response.data.expires_in) {
        this.tokenExpiration = Date.now() + response.data.expires_in * 1000;
      }

      console.log('[API Externa] Login realizado com sucesso');
      return this.token;
    } catch (error: any) {
      console.error('[API Externa] Erro no login:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        } : 'Sem resposta',
        url: `${API_EXTERNA_BASE}/token`
      });
      return null;
    }
  }

  private isTokenValid(): boolean {
    if (!this.token) return false;
    if (!this.tokenExpiration) return true;
    return Date.now() < this.tokenExpiration;
  }

  async ensureAuthenticated(username: string, password: string): Promise<boolean> {
    if (this.isTokenValid()) {
      return true;
    }
    const token = await this.login(username, password);
    return token !== null;
  }

  async buscarNotaFiscalPorNumeroSerie(
    numero: string,
    serie: string,
    username: string,
    password: string
  ): Promise<NotaFiscalExterna | null> {
    try {
      const authenticated = await this.ensureAuthenticated(username, password);
      if (!authenticated) {
        console.error('[API Externa] Falha na autenticação');
        return null;
      }

      // Tenta buscar por número/série
      try {
        const response = await this.apiInstance.get<NotaFiscalExterna>(
          `/api/v1/notas-fiscais/numero/${numero}/${serie}`,
          { validateStatus: (s) => s < 500 }
        );
        if (response.status === 200 && response.data) {
          console.log('[API Externa] Nota fiscal encontrada por número/série:', response.data);
          return response.data;
        }
      } catch (e) {
        console.log('[API Externa] Falha em numero/<numero>/<serie>, tentando identificacao-nfe...');
      }

      // Fallback: tentar identificação-nfe com o número (alguns ambientes usam o número como identificador)
      try {
        const respIdent = await this.apiInstance.get<NotaFiscalExterna>(
          `/api/v1/notas-fiscais/identificacao-nfe/${numero}`,
          { validateStatus: (s) => s < 500 }
        );
        if (respIdent.status === 200 && respIdent.data) {
          console.log('[API Externa] Nota fiscal encontrada por identificacao-nfe (numero):', respIdent.data);
          return respIdent.data;
        }
      } catch (e) {
        console.log('[API Externa] Nenhuma nota encontrada em identificacao-nfe (numero).');
      }

      // Sem resultados
      return null;
    } catch (error: any) {
      console.error(
        '[API Externa] Erro ao buscar nota fiscal:',
        error.response?.data || error.message
      );
      return null;
    }
  }

  async buscarNotaFiscalPorChave(
    chave: string,
    username: string,
    password: string
  ): Promise<NotaFiscalExterna | null> {
    try {
      const authenticated = await this.ensureAuthenticated(username, password);
      if (!authenticated) {
        console.error('[API Externa] Falha na autenticação');
        return null;
      }

      // Primeiro tenta pelo endpoint de identificação da NFe (aceita a chave)
      try {
        const respIdent = await this.apiInstance.get<NotaFiscalExterna>(
          `/api/v1/notas-fiscais/identificacao-nfe/${chave}`,
          { validateStatus: (s) => s < 500 }
        );
        if (respIdent.status === 200 && respIdent.data) {
          console.log('[API Externa] Nota fiscal encontrada por identificacao-nfe:', respIdent.data);
          return respIdent.data;
        }
      } catch (e) {
        console.log('[API Externa] Falha em identificacao-nfe, tentando chave/<chave>...');
      }

      // Fallback pelo endpoint chave/<chave>
      const response = await this.apiInstance.get<NotaFiscalExterna>(
        `/api/v1/notas-fiscais/chave/${chave}`,
        { validateStatus: (s) => s < 500 }
      );

      if (response.status === 200 && response.data) {
        console.log('[API Externa] Nota fiscal encontrada por chave:', response.data);
        return response.data;
      }
      return null;
    } catch (error: any) {
      console.error(
        '[API Externa] Erro ao buscar nota fiscal por chave:',
        error.response?.data || error.message
      );
      return null;
    }
  }

  async buscarCliente(
    clienteId: string,
    username: string,
    password: string
  ): Promise<ClienteExterna | null> {
    try {
      const authenticated = await this.ensureAuthenticated(username, password);
      if (!authenticated) {
        console.error('[API Externa] Falha na autenticação');
        return null;
      }

      const response = await this.apiInstance.get<ClienteExterna>(
        `/api/v1/clientes/${clienteId}`
      );

      console.log('[API Externa] Cliente encontrado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        '[API Externa] Erro ao buscar cliente:',
        error.response?.data || error.message
      );
      return null;
    }
  }

  async buscarPedidoPorNumero(
    numeroPedido: string,
    username: string,
    password: string
  ): Promise<PedidoExterno[] | null> {
    try {
      console.log(`[API Externa] Buscando pedido: ${numeroPedido}`);
      
      const authenticated = await this.ensureAuthenticated(username, password);
      if (!authenticated) {
        console.error('[API Externa] Falha na autenticação');
        return null;
      }

      console.log(`[API Externa] Realizando requisição para /api/v1/pedidos?numero_pedido=${encodeURIComponent(numeroPedido)}`);
      
      const response = await this.apiInstance.get<{ data: PedidoExterno[] }>(
        `/api/v1/pedidos`,
        {
          params: {
            numero_pedido: numeroPedido,
            limit: 1  // Apenas 1 resultado já que estamos buscando por um pedido específico
          },
          validateStatus: (status) => status < 500 // Para capturar erros 4xx também
        }
      );

      console.log('[API Externa] Resposta da API:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      if (response.data && Array.isArray((response.data as any).data)) {
        const pedidos = (response.data as any).data;
        console.log(`[API Externa] ${pedidos.length} pedido(s) encontrado(s)`);
        return pedidos;
      }
      
      return null;
    } catch (error: any) {
      console.error(
        '[API Externa] Erro ao buscar pedido:',
        error.response?.data || error.message
      );
      return null;
    }
  }

  async buscarNotaFiscalPorNumeroPedido(
    numeroPedido: string,
    username: string,
    password: string
  ): Promise<NotaFiscalExterna | null> {
    try {
      const authenticated = await this.ensureAuthenticated(username, password);
      if (!authenticated) {
        console.error('[API Externa] Falha na autenticação');
        return null;
      }

      console.log(`[API Externa] Buscando nota fiscal pelo número do pedido: ${numeroPedido}`);
      
      // Primeiro, tenta buscar a nota fiscal pelo número do pedido como identificação NFe
      try {
        const response = await this.apiInstance.get<NotaFiscalExterna>(
          `/api/v1/notas-fiscais/identificacao-nfe/${numeroPedido}`,
          {
            validateStatus: (status) => status < 500 // Para capturar erros 4xx também
          }
        );

        if (response.data) {
          console.log('[API Externa] Nota fiscal encontrada por número de pedido:', response.data);
          return response.data;
        }
      } catch (error) {
        console.log('[API Externa] Nenhuma nota encontrada pelo endpoint de identificação NFe, tentando busca completa...');
      }
      
      // Se não encontrou pelo endpoint de identificação, tenta buscar na lista de notas
      const responseLista = await this.apiInstance.get<{data: NotaFiscalExterna[]}>(
        '/api/v1/notas-fiscais',
        {
          params: {
            limit: 100, // Aumentar o limite para buscar mais notas
            offset: 0
          },
          validateStatus: (status) => status < 500
        }
      );
      
      if (responseLista.data && responseLista.data.data) {
        // Procurar a nota que tenha o número do pedido em algum campo
        const notaEncontrada = responseLista.data.data.find(nota => 
          (nota as any).IDENTIFICACAO_NFE === numeroPedido || 
          (nota as any).NUMERO_PEDIDO === numeroPedido ||
          (nota as any).OBSERVACOES?.includes(numeroPedido) ||
          (nota as any).CHAVE_NFE?.includes(numeroPedido)
        );
        
        if (notaEncontrada) {
          console.log('[API Externa] Nota fiscal encontrada na lista:', notaEncontrada);
          return notaEncontrada;
        }
      }
      
      return null;
    } catch (error: any) {
      console.error(
        '[API Externa] Erro ao buscar nota fiscal por número de pedido:',
        error.response?.data || error.message
      );
      return null;
    }
  }

  async listarNotasFiscais(
    filtros: {
      dataInicio?: string;
      dataFim?: string;
      clienteId?: string;
    },
    username: string,
    password: string
  ): Promise<NotaFiscalExterna[]> {
    try {
      const authenticated = await this.ensureAuthenticated(username, password);
      if (!authenticated) {
        console.error('[API Externa] Falha na autenticação');
        return [];
      }

      const params = new URLSearchParams();
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.clienteId) params.append('clienteId', filtros.clienteId);

      const response = await this.apiInstance.get<NotaFiscalExterna[]>(
        `/api/v1/notas-fiscais?${params.toString()}`
      );

      console.log('[API Externa] Notas fiscais encontradas:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error(
        '[API Externa] Erro ao listar notas fiscais:',
        error.response?.data || error.message
      );
      return [];
    }
  }

  async listarPedidos(
    filtros: {
      data_inicio?: string;
      data_fim?: string;
      limit?: number;
      offset?: number;
      tipo_data?: string;
      tipo_entrega?: string;
      status?: string;
      search?: string;
    },
    username: string,
    password: string
  ): Promise<{ data: PedidoExterno[]; total: number; limit: number; offset: number } | null> {
    try {
      const authenticated = await this.ensureAuthenticated(username, password);
      if (!authenticated) {
        console.error('[API Externa] Falha na autenticação');
        return null;
      }

      const params = new URLSearchParams();
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.limit) params.append('limit', filtros.limit.toString());
      if (filtros.offset) params.append('offset', filtros.offset.toString());
      if (filtros.tipo_data) params.append('tipo_data', filtros.tipo_data);
      if (filtros.tipo_entrega) params.append('tipo_entrega', filtros.tipo_entrega);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.search) params.append('search', filtros.search);

      const url = `/api/v1/pedidos${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('[API Externa] Buscando pedidos:', url);

      const response = await this.apiInstance.get<{
        data: PedidoExterno[];
        total: number;
        limit: number;
        offset: number;
      }>(url, {
        validateStatus: (status) => status < 500
      });

      console.log('[API Externa] Pedidos encontrados:', response.data.data?.length || 0);
      return response.data;
    } catch (error: any) {
      console.error(
        '[API Externa] Erro ao listar pedidos:',
        error.response?.data || error.message
      );
      return null;
    }
  }

  async listarApuracoes(
    filtros: {
      data_inicio?: string;
      data_fim?: string;
      limit?: number;
      offset?: number;
    },
    username: string,
    password: string
  ): Promise<{ data: ApuracaoExterna[]; total: number; limit: number; offset: number } | null> {
    try {
      const authenticated = await this.ensureAuthenticated(username, password);
      if (!authenticated) {
        console.error('[API Externa] Falha na autenticação');
        return null;
      }

      const params = new URLSearchParams();
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.limit) params.append('limit', filtros.limit.toString());
      if (filtros.offset) params.append('offset', filtros.offset.toString());

      const url = `/api/v1/apuracoes${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('[API Externa] Buscando apurações:', url);

      const response = await this.apiInstance.get<{
        data: ApuracaoExterna[];
        total: number;
        limit: number;
        offset: number;
      }>(url, {
        validateStatus: (status) => status < 500
      });

      console.log('[API Externa] Apurações encontradas:', response.data.data?.length || 0);
      return response.data;
    } catch (error: any) {
      console.error(
        '[API Externa] Erro ao listar apurações:',
        error.response?.data || error.message
      );
      return null;
    }
  }
}

export const apiExternaService = new APIExternaService();
export type { NotaFiscalExterna, ClienteExterna, PedidoExterno, ApuracaoExterna };
