import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';


// Leaflet markers fix
const fixLeafletIcons = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
};

export interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  details?: string;
  id?: string;
  type?: 'start' | 'delivery';
}


export interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routeWaypoints?: [number, number][];
  height?: string;
  onRoutingError?: (error: any) => void;
}


// Routing temporarily disabled due to chunk load issues with leaflet-routing-machine
const RoutingHandler = ({ waypoints, onError }: { waypoints: [number, number][], onError?: (error: any) => void }) => {
  // TODO: Implement routing using a different method or fix import
  return null;
};

const LeafletMap = ({ 
  center = [-23.5505, -46.6333], 
  zoom = 13, 
  markers = [], 
  routeWaypoints, 
  height = '400px',
  onRoutingError
}: MapProps) => {

  useEffect(() => {
    fixLeafletIcons();
  }, []);

  return (
    <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {(() => {
          // Group markers by coordinates (rounding to 3 decimals ~110 meters)
          const groups: Record<string, MapMarker[]> = {};
          markers.forEach(m => {
            const key = `${m.lat.toFixed(3)},${m.lng.toFixed(3)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
          });


          return Object.entries(groups).map(([key, groupMarkers], idx) => {
            const first = groupMarkers[0];
            const count = groupMarkers.length;
            const isMultiple = count > 1;

            return (
              <Marker 
                key={key} 
                position={[first.lat, first.lng]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color: ${first.type === 'start' ? '#10b981' : (isMultiple ? '#f97316' : '#2563eb')}; width: ${isMultiple ? '28px' : '18px'}; height: ${isMultiple ? '28px' : '18px'}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: ${isMultiple ? '12px' : '10px'}; font-weight: bold;">${isMultiple ? count : ''}</div>`,
                  iconSize: [isMultiple ? 28 : 18, isMultiple ? 28 : 18],
                  iconAnchor: [isMultiple ? 14 : 9, isMultiple ? 14 : 9]
                })}
              >

                <Tooltip permanent={isMultiple} direction="top" offset={[0, isMultiple ? -15 : -10]}>
                  <div style={{ fontWeight: '600', fontSize: '11px' }}>
                    {isMultiple ? `${count} Entregas` : first.label}
                  </div>
                </Tooltip>
                <Popup>
                  <div style={{ minWidth: '200px', maxHeight: '300px', overflowY: 'auto' }}>
                    <div style={{ fontWeight: 'bold', color: first.type === 'start' ? '#10b981' : (isMultiple ? '#f59e0b' : '#3b82f6'), marginBottom: '8px', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                      {first.type === 'start' ? first.label : (isMultiple ? `${count} Entregas nesta localização` : first.label)}
                    </div>
                    {groupMarkers.map((m, mIdx) => (
                      <div key={mIdx} style={{ fontSize: '12px', color: '#475569', marginBottom: mIdx < count - 1 ? '8px' : '0px', borderBottom: mIdx < count - 1 ? '1px dashed #f1f5f9' : 'none', paddingBottom: '4px' }}>

                        <div style={{ fontWeight: 'bold' }}>{m.label}</div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{m.details}</div>
                        {m.type !== 'start' && (
                          <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <a
                              href={`https://www.google.com/maps?q=${m.lat},${m.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px',
                                backgroundColor: '#3b82f6', color: 'white',
                                textDecoration: 'none', fontSize: '10px', fontWeight: 'bold'
                              }}
                            >
                              📍 Google Maps
                            </a>
                            <button
                              onClick={() => {
                                const url = `https://www.google.com/maps?q=${m.lat},${m.lng}`;
                                const text = `${m.label}\n${m.details || ''}\n${url}`;
                                if (navigator.share) {
                                  navigator.share({ title: m.label, text, url }).catch(() => {
                                    navigator.clipboard.writeText(text).catch(() => {});
                                  });
                                } else {
                                  navigator.clipboard.writeText(text).then(() => {
                                    alert('Link copiado!');
                                  }).catch(() => {
                                    window.open(url, '_blank');
                                  });
                                }
                              }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                padding: '3px 8px', borderRadius: '6px',
                                backgroundColor: '#8b5cf6', color: 'white',
                                border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold'
                              }}
                            >
                              📋 Compartilhar
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Popup>
              </Marker>
            );
          });
        })()}



        {routeWaypoints && routeWaypoints.length >= 2 && (
          <RoutingHandler 
            waypoints={routeWaypoints} 
            onError={onRoutingError}
          />
        )}

      </MapContainer>

      {/* Legenda do Mapa */}
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        right: '20px', 
        backgroundColor: 'rgba(255,255,255,0.9)', 
        padding: '10px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        zIndex: 1000,
        fontSize: '11px',
        border: '1px solid #ddd'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Legenda:</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10b981', marginRight: '5px', border: '1px solid white' }}></div>
          CD (Ponto de Partida)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f97316', marginRight: '5px', border: '1px solid white' }}></div>
          Múltiplas Entregas (N)
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#2563eb', marginRight: '5px', border: '1px solid white' }}></div>
          Entrega Única
        </div>
      </div>
    </div>
  );
};


export default LeafletMap;
