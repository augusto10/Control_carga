import axios, { AxiosInstance } from 'axios';

// Cria uma instância do Axios com configurações padrão
const createApi = (): AxiosInstance => {
  // Define a URL base da API.
  // Se a variável de ambiente não estiver definida, usamos string vazia para
  // que as requisições sejam relativas ao mesmo host/porta do front-end.
  let baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  // Remove /api do final da URL para evitar duplicação
  if (baseURL.endsWith('/api')) {
    baseURL = baseURL.slice(0, -4);
  }
  const cleanBaseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
  
  const instance = axios.create({
    baseURL: cleanBaseURL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    withCredentials: true, // Importante para enviar cookies HTTP-only
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
  });
  
  // Configuração global para todas as requisições
  instance.defaults.withCredentials = true;
  
  // Interceptor de requisição
  instance.interceptors.request.use(
    (config) => {
      console.log('[API] Enviando requisição para:', config.url);
      console.log('[API] Método:', config.method);
      console.log('[API] withCredentials:', config.withCredentials);
      
      // Adiciona o header X-Requested-With para identificar requisições AJAX
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      
      // Garante que withCredentials está habilitado para enviar cookies
      config.withCredentials = true;
      
      // Log dos headers da requisição para depuração
      console.log('[API] Headers da requisição:', JSON.stringify(config.headers, null, 2));
      
      return config;
    },
    (error) => {
      console.error('[API] Erro no interceptor de requisição:', error);
      return Promise.reject(error);
    }
  );

  // Interceptor de resposta
  instance.interceptors.response.use(
    (response) => {
      console.log('[API] Resposta recebida:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
        headers: response.headers,
        cookies: document.cookie
      });
      
      // Log detalhado dos cookies (apenas no navegador)
      if (typeof window !== 'undefined') {
        console.log('[API] Cookies disponíveis:', document.cookie);
      }
      
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      
      console.error('[API] Erro na resposta:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        response: error.response?.data
      });
      
      // Se o erro for 401 (não autorizado) e não for uma tentativa de refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        console.log('[API] Erro 401 - Token expirado ou inválido');
        console.log('[API] URL da requisição:', error.config?.url);
        console.log('[API] Método:', error.config?.method);
        console.log('[API] Headers da requisição:', error.config?.headers);
        
        // Se estivermos no navegador e não for a rota de login
        if (typeof window !== 'undefined') {
          console.log('[API] Path atual:', window.location.pathname);
          if (!window.location.pathname.includes('/login')) {
            console.log('[API] Disparando evento de não autorizado');
            // Limpa qualquer estado de autenticação
            window.dispatchEvent(new Event('unauthorized'));
          }
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
