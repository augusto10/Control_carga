import React, { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { RoutingService } from '../services/routing';

const cores = ['red', 'blue', 'green', 'purple', 'orange', 'black'];

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet markers fix
const fixLeafletIcons = () => {
  // @ts-expect-error Leaflet modifies prototype dynamically
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
  color?: string;
  sequence?: number;
  valorPedido?: number;
  pesoPedido?: number;
  clienteNome?: string;
  bairro?: string;
  cidade?: string;
  orcamentoId?: number;
  groupName?: string;
}

export interface RouteInfo {
  regiao: number;
  distance?: number;
  duration?: number;
  label?: string;
}

export interface RouteGeometry {
  geometry: [number, number][];
  regiao: number;
  distance?: number;
  duration?: number;
  label?: string;
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  routeWaypoints?: [number, number][];
  routeGeometry?: RouteGeometry[];
  height?: string;
  onRoutingError?: (error: any) => void;
  onMarkerMove?: (id: string, lat: number, lng: number) => void;
  onMarkerClick?: (markers: MapMarker[]) => void;
}

const RoutingHandler = ({
  routeGeometry,
}: {
  waypoints: [number, number][];
  routeGeometry?: RouteGeometry[];
  onError?: (error: any) => void;
}) => {
  const map = useMap();

  useEffect(() => {
    if (!routeGeometry || routeGeometry.length === 0) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Polyline && (layer as any)._isRoute) {
        map.removeLayer(layer);
      }
    });

    routeGeometry.forEach((rota) => {
      const polyline = L.polyline(rota.geometry, {
        color: cores[rota.regiao % cores.length],
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
        smoothFactor: 1,
      });

      (polyline as any)._isRoute = true;
      polyline.addTo(map);
    });

    const allCoords = routeGeometry.flatMap((r) => r.geometry);
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [routeGeometry, map]);

  return null;
};

const LeafletMap = ({
  center = [-23.5505, -46.6333],
  zoom = 13,
  markers = [],
  routeWaypoints,
  routeGeometry,
  height = '400px',
  onRoutingError,
  onMarkerMove,
  onMarkerClick,
}: MapProps) => {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  const formatCurrency = (value?: number) => {
    const amount = Number.isFinite(value as number) ? Number(value) : 0;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatPeso = (value?: number) => {
    const peso = Number.isFinite(value as number) ? Number(value) : 0;
    return `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(peso)} kg`;
  };

  return (
    <div
      style={{
        height,
        width: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        position: 'relative',
      }}
    >
      <style jsx>{`
        .leaflet-container {
          cursor: default !important;
        }
        .leaflet-interactive {
          cursor: pointer !important;
        }
        .custom-marker-icon {
          cursor: pointer !important;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        boxZoom={false}
        keyboard={false}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {(() => {
          const groups: Record<string, MapMarker[]> = {};
          markers.forEach((m) => {
            const key = `${m.lat.toFixed(5)},${m.lng.toFixed(5)}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(m);
          });

          return Object.entries(groups).map(([key, groupMarkers]) => {
            const first = groupMarkers[0];
            const count = groupMarkers.length;
            const isMultiple = count > 1;

            const getMarkerIcon = (marker: MapMarker, hasMultiple: boolean, multipleCount: number) => {
              if (hasMultiple && marker.type !== 'start') {
                return L.divIcon({
                  className: 'custom-marker-icon',
                  html: `
                    <div style="
                      width:34px;
                      height:34px;
                      border-radius:999px;
                      background:#f97316;
                      color:#fff;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      border:3px solid #fff;
                      box-shadow:0 10px 18px rgba(15,23,42,0.28);
                      font-size:12px;
                      font-weight:900;
                      font-family:Arial,sans-serif;
                    ">${multipleCount}</div>`,
                  iconSize: [38, 38],
                  iconAnchor: [19, 19],
                });
              }

              const size = marker.type === 'start' ? 34 : 30;
              const color = marker.color || (marker.type === 'start' ? '#059669' : '#ea4335');
              const label = marker.type === 'start' ? 'CD' : String(marker.sequence || '');

              return L.divIcon({
                className: 'custom-marker-icon',
                html: `
                  <div style="
                    position:relative;
                    width:${size}px;
                    height:${size}px;
                    border-radius:50% 50% 50% 0;
                    background:${color};
                    transform:rotate(-45deg);
                    border:2px solid #fff;
                    box-shadow:0 10px 18px rgba(15,23,42,0.28);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    box-sizing:border-box;
                  ">
                    <span style="
                      transform:rotate(45deg);
                      color:#fff;
                      font-size:${marker.type === 'start' ? '10px' : '11px'};
                      font-weight:900;
                      line-height:1;
                      font-family:Arial,sans-serif;
                    ">${label}</span>
                  </div>`,
                iconSize: [size, size],
                iconAnchor: [size / 2, size],
              });
            };

            return (
              <Marker
                key={key}
                position={[first.lat, first.lng]}
                icon={getMarkerIcon(first, isMultiple, count)}
                draggable={!isMultiple && Boolean(first.id)}
                eventHandlers={{
                  click: () => onMarkerClick?.(groupMarkers),
                  dragend: (event: any) => {
                    const moved = event.target?.getLatLng?.();
                    if (first.id && moved) {
                      onMarkerMove?.(first.id, moved.lat, moved.lng);
                    }
                  },
                }}
              >
                <Tooltip permanent={isMultiple} direction="top" offset={[0, isMultiple ? -15 : -10]}>
                  <div style={{ fontWeight: '600', fontSize: '11px' }}>
                    {isMultiple
                      ? `${count} Entregas`
                      : first.type === 'delivery' && first.sequence
                        ? `${first.sequence} - ${first.label}`
                        : first.label}
                  </div>
                </Tooltip>
                <Popup>
                  <div
                    style={{
                      minWidth: '250px',
                      maxWidth: '350px',
                      maxHeight: '400px',
                      overflowY: 'auto',
                      fontFamily: 'Arial, sans-serif',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 'bold',
                        color: first.type === 'start' ? '#10b981' : isMultiple ? '#f59e0b' : '#3b82f6',
                        marginBottom: '12px',
                        fontSize: '16px',
                        borderBottom: '2px solid #eee',
                        paddingBottom: '8px',
                        textAlign: 'center',
                      }}
                    >
                      {first.type === 'start' ? first.label : isMultiple ? `${count} Entregas nesta localização` : first.label}
                    </div>
                    {groupMarkers.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        style={{
                          fontSize: '13px',
                          color: '#374151',
                          marginBottom: mIdx < count - 1 ? '12px' : '0px',
                          borderBottom: mIdx < count - 1 ? '1px solid #f3f4f6' : 'none',
                          paddingBottom: '8px',
                          backgroundColor: '#fafafa',
                          padding: '8px',
                          borderRadius: '6px',
                        }}
                      >
                        <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#1f2937' }}>{m.label}</div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '8px' }}>{m.details}</div>
                        {m.type !== 'start' && (
                          <div style={{ marginBottom: '8px', fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                            {typeof m.valorPedido === 'number' && <div>Valor: <strong>{formatCurrency(m.valorPedido)}</strong></div>}
                            {typeof m.pesoPedido === 'number' && <div>Peso: <strong>{formatPeso(m.pesoPedido)}</strong></div>}
                            {m.groupName && <div>Grupo: <strong>{m.groupName}</strong></div>}
                            <div>Lat/Lng: <strong>{m.lat.toFixed(6)}, {m.lng.toFixed(6)}</strong></div>
                          </div>
                        )}
                        {m.type !== 'start' && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
                                transition: 'background-color 0.2s',
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#7c3aed';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#8b5cf6';
                              }}
                            >
                              Compartilhar
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

        {routeGeometry && routeGeometry.length > 0 && (
          <RoutingHandler
            waypoints={routeWaypoints || []}
            routeGeometry={routeGeometry}
            onError={onRoutingError}
          />
        )}
      </MapContainer>

      {routeGeometry && routeGeometry.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: 'rgba(255,255,255,0.96)',
            padding: '12px',
            borderRadius: '14px',
            boxShadow: '0 10px 30px rgba(15,23,42,0.14)',
            zIndex: 1000,
            fontSize: '14px',
            border: '1px solid #e5e7eb',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '188px',
            maxWidth: '220px',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
            Resumo da rota
          </div>
          {routeGeometry.map((rota, idx) => {
            const cor = rota.regiao % cores.length === 0 ? '#2563eb' : '#7c3aed';
            const fundo = rota.regiao % cores.length === 0 ? 'rgba(37,99,235,0.10)' : 'rgba(124,58,237,0.10)';

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px 10px',
                  borderRadius: '12px',
                  background: fundo,
                  border: `1px solid ${cor}22`,
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: cor }}>
                  {rota.label || `Região ${rota.regiao + 1}`}: {RoutingService.formatDistance(rota.distance || 0)}
                </div>
                {rota.duration && (
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                    {RoutingService.formatDuration(rota.duration)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '12px',
          borderRadius: '12px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '12px',
          border: '1px solid #e5e7eb',
          backdropFilter: 'blur(4px)',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#374151', textAlign: 'center' }}>Legenda</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              marginRight: '8px',
              border: '2px solid white',
              boxShadow: '0 0 4px rgba(16, 185, 129, 0.4)',
            }}
          ></div>
          <span style={{ color: '#4b5563' }}>CD (Ponto de Partida)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#f97316',
              marginRight: '8px',
              border: '2px solid white',
              boxShadow: '0 0 4px rgba(249, 115, 22, 0.4)',
            }}
          ></div>
          <span style={{ color: '#4b5563' }}>Múltiplas Entregas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: '#2563eb',
              marginRight: '8px',
              border: '2px solid white',
              boxShadow: '0 0 4px rgba(37, 99, 235, 0.4)',
            }}
          ></div>
          <span style={{ color: '#4b5563' }}>Entrega Única</span>
        </div>
      </div>
    </div>
  );
};

export default LeafletMap;
