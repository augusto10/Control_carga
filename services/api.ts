import axios, { AxiosInstance } from 'axios';

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
      // Verifica se estamos no navegador antes de acessar o localStorage
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('@ControlCarga:token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Intercepta respostas para tratar erros de autenticação
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Redireciona para a página de login se não estiver autenticado
        if (typeof window !== 'undefined') {
          localStorage.removeItem('@ControlCarga:token');
          localStorage.removeItem('@ControlCarga:user');
          window.location.href = '/login';
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
