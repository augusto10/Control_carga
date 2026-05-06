import dynamic from 'next/dynamic';
import React from 'react';

// Types from the inner component
import type { MapProps, MapMarker, RouteInfo } from './LeafletMap';

export interface RouteGeometry {
  geometry: [number, number][]; // [lat, lng][]
  regiao: number;
  distance?: number;
  duration?: number;
}

// Export types for use in other files
export type { MapProps, MapMarker, RouteInfo };

// Main Export with Dynamic Import to fix SSR
// We import the component that has the standard ESM imports
const Map = dynamic(() => import('./LeafletMap').then(mod => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-slate-100 animate-pulse flex items-center justify-center rounded-xl" style={{ height: '400px' }}>
      <p className="text-slate-400 font-medium">Carregando mapa...</p>
    </div>
  )
});

export default Map;
