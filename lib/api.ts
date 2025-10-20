import axios from 'axios';

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export default api;
