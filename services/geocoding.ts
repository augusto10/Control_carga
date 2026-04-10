import axios from 'axios';

export interface Coordenadas {
  lat: number;
  lng: number;
  display_name?: string;
}

class GeocodingService {
  private static CACHE_KEY = 'geocoding_cache';
  private static OPENCAGE_API_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY || 'YOUR_OPENCAGE_API_KEY'; // Substitua pela sua chave

  private static getCache(): Record<string, Coordenadas> {
    if (typeof window === 'undefined') return {};
    const cached = localStorage.getItem(this.CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  }

  private static setCache(address: string, coords: Coordenadas) {
    if (typeof window === 'undefined') return;
    const cache = this.getCache();
    cache[address] = coords;
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
  }

  static async geocode(address: string, retryCount = 0): Promise<Coordenadas | null> {
    const cache = this.getCache();

    if (cache[address]) {
      console.log(`[Geocoding] Cache hit for: ${address}`);
      return cache[address];
    }

    try {
      console.log(`[Geocoding] Fetching with OpenCage: ${address}`);
      let searchAddress = address.includes('Brasil') ? address : `${address}, Brasil`;

      // Normalizar CEP
      searchAddress = searchAddress.replace(/(\d{5})-(\d{3})/, '$1$2');

      const response = await axios.get('https://api.opencagedata.com/geocode/v1/json', {
        params: {
          q: searchAddress,
          key: this.OPENCAGE_API_KEY,
          limit: 1,
          language: 'pt-BR', // Para respostas em português
        },
        timeout: 15000,
      });

      if (response.data && response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];
        const coords: Coordenadas = {
          lat: result.geometry.lat,
          lng: result.geometry.lng,
          display_name: result.formatted,
        };
        this.setCache(address, coords);
        return coords;
      }

      // Fallbacks similares
      const cepMatch = address.match(/\d{5}-?\d{3}/);
      const numeroMatch = address.match(/, (\d+),/);

      if (retryCount === 0 && cepMatch) {
        if (numeroMatch) {
          const cepPlusNum = `${cepMatch[0]}, ${numeroMatch[1]}`;
          console.log(`[Geocoding] Retrying with CEP + Number: ${cepPlusNum}`);
          const res = await this.geocode(cepPlusNum, 1);
          if (res) return res;
        }

        console.log(`[Geocoding] Retrying with CEP only: ${cepMatch[0]}`);
        return await this.geocode(cepMatch[0], 1);
      }

      if (retryCount === 0 && address.includes(',')) {
        const parts = address.split(',');
        if (parts.length > 3) {
          const fallbackAddr = [parts[0], parts[2], parts[3], parts[4], parts[5]].filter(Boolean).join(', ');
          console.log(`[Geocoding] Retrying without number/lote: ${fallbackAddr}`);
          return await this.geocode(fallbackAddr, 1);
        }
      }

      return null;

    } catch (error: any) {
      if (error.response?.status === 429 && retryCount < 3) {
        console.log(`[Geocoding] Rate limit hit (429), retrying (${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.geocode(address, retryCount + 1);
      }

      if (retryCount < 2) {
        console.log(`[Geocoding] Request failed, retrying...`);
        return this.geocode(address, retryCount + 1);
      }

      console.error('[Geocoding] Error:', error);
      return null;
    }

  }

  static async geocodeMany(addresses: string[]): Promise<Record<string, Coordenadas | null>> {
    const results: Record<string, Coordenadas | null> = {};

    // Process sequentially to respect API limits
    for (const address of addresses) {
      results[address] = await this.geocode(address);
      // Wait 1 second if it wasn't a cache hit
      const cache = this.getCache();
      if (!cache[address]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export { GeocodingService };
