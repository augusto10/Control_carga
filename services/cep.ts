import axios from 'axios';

export interface CEPData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

class CEPService {
  private static CACHE_KEY = 'cep_cache';

  private static getCache(): Record<string, CEPData> {
    if (typeof window === 'undefined') return {};
    const cached = localStorage.getItem(this.CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  }

  private static setCache(cep: string, data: CEPData) {
    if (typeof window === 'undefined') return;
    const cache = this.getCache();
    cache[cep.replace(/\D/g, '')] = data;
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  static async buscarCEP(cep: string): Promise<CEPData | null> {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length !== 8) return null;

    const cache = this.getCache();
    if (cache[cleanCEP]) {
      console.log(`[CEP Service] Cache hit for: ${cleanCEP}`);
      return cache[cleanCEP];
    }

    try {
      console.log(`[CEP Service] Buscando no ViaCEP: ${cleanCEP}`);
      const response = await axios.get<CEPData>(`https://viacep.com.br/ws/${cleanCEP}/json/`);
      
      if (response.data && !response.data.erro) {
        this.setCache(cleanCEP, response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('[CEP Service] Erro ao buscar CEP:', error);
      return null;
    }
  }
}

export { CEPService };
