// services/routing.ts
export interface RouteResult {
  geometry: [number, number][]; // [lng, lat][]
  distance: number; // meters
  duration: number; // seconds
}

export class RoutingService {
  private static readonly OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

  static async calculateRoute(waypoints: [number, number][]): Promise<RouteResult> {
    if (waypoints.length < 2) {
      throw new Error('Pelo menos 2 waypoints são necessários');
    }

    // OSRM limita a 25 waypoints por requisição
    if (waypoints.length > 25) {
      throw new Error('Máximo de 25 waypoints por rota. Divida em rotas menores.');
    }

    // Converter para lng,lat
    const coordinates = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
    const url = `${this.OSRM_BASE_URL}/${coordinates}?overview=full&geometries=geojson&steps=false`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na API OSRM: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('Nenhuma rota encontrada');
    }

    const route = data.routes[0];
    const geometry: [number, number][] = route.geometry.coordinates; // [[lng, lat], ...]

    return {
      geometry,
      distance: route.distance,
      duration: route.duration,
    };
  }

  static formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }

  static formatDuration(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }
}