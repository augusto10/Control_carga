import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

// Cria uma instância do Axios com configurações padrão
const createApi = (): AxiosInstance => {
  // Remove a barra final da URL base, se existir
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  
  const instance = axios.create({
    baseURL: cleanBaseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Adiciona o token JWT às requisições
  instance.interceptors.request.use(
    (config) => {
      console.log('[API] Enviando requisição para:', config.url);
      console.log('[API] Método:', config.method);
      
      // Verifica se estamos no navegador antes de acessar os cookies
      if (typeof window !== 'undefined') {
        const token = Cookies.get('auth_token');
        if (token) {
          console.log('[API] Token JWT encontrado, adicionando ao cabeçalho');
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.log('[API] Nenhum token JWT encontrado');
        }
      }
      
      // Adiciona cabeçalhos CORS
      config.headers['Access-Control-Allow-Origin'] = '*';
      config.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,PATCH,OPTIONS';
      config.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      
      return config;
    },
    (error) => {
      console.error('[API] Erro no interceptor de requisição:', error);
      return Promise.reject(error);
    }
  );

  // Intercepta respostas para tratar erros de autenticação
  instance.interceptors.response.use(
    (response) => {
      console.log('[API] Resposta recebida:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
      return response;
    },
    (error) => {
      console.error('[API] Erro na resposta:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        response: error.response?.data
      });
      
      if (error.response?.status === 401) {
        console.log('[API] Erro 401 - Não autorizado');
        // Remove o token inválido
        if (typeof window !== 'undefined') {
          console.log('[API] Removendo token inválido');
          Cookies.remove('auth_token');
          // Não redireciona automaticamente, deixa o AuthContext lidar com isso
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Cria e exporta a instância da API
const api = createApi();

export { api };
export default api;
