import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';

import {
  Box,
  Container,
  Typography,
  Grid,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Tooltip as MuiTooltip,
  ListSubheader,
  ToggleButtonGroup,
  ToggleButton,
  MenuItem
} from '@mui/material';


import {
  Search as SearchIcon,
  LocationOn as LocationOnIcon,
  Route as RouteIcon,
  LocalShipping as ShippingIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
  Map as MapIcon,
  DragIndicator as DragIndicatorIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon
} from '@mui/icons-material';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';



import { useSnackbar } from 'notistack';
import Map, { MapMarker } from '../components/Map';
import { GeocodingService } from '../services/geocoding';
import { RoutingService } from '../services/routing';
import axios from 'axios';
import { AppLayout } from '@/components/layout/AppLayout';
import { CEPService } from '../services/cep';

const cores = ['red', 'blue', 'green', 'purple', 'orange', 'black'];

const perfil6mOrange = '#f97316';
const perfil6mOrangeDark = '#c2410c';
const perfil6mOrangeBg = '#fff7ed';




interface NotaExterna {
  numero: string;
  serie: string;
  cliente?: {
    nome?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    bairro?: string;
  };
  numeroEndereco?: string;
  complemento?: string;
  peso?: number;
  valor?: number;
  orcamentoId?: number;
  tipoEntrega?: string;
  coords?: { lat: number; lng: number } | null;
  statusGeocoding?: 'loading' | 'success' | 'error' | null;
  erroMensagem?: string;
  _debugRaw?: { b: string, c: string, e: string };
}

interface Perfil6mPedidoAlerta {
  pedidoId: number;
  hasPerfil6m: boolean;
  totalQuantidade: number;
  totalItensPedido: number;
  itens: Array<{
    produtoNome: string;
    quantidade: number;
    codigoBarras: string | null;
    codigoOriginal: string | null;
  }>;
  error?: string;
  loading?: boolean;
}

interface Perfil6mPedidosResponse {
  data?: Record<string, Perfil6mPedidoAlerta>;
}








const SortableItem = ({ id, children }: { id: string; children: React.ReactNode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const RoteirizacaoPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [notas, setNotas] = useState<NotaExterna[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][]>([]);
  const [routeGeometry, setRouteGeometry] = useState<any[]>([]);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [mostrarApenasFalhas, setMostrarApenasFalhas] = useState(false);
  const [daysToLoad, setDaysToLoad] = useState<number>(7);
  const [selectedBairro, setSelectedBairro] = useState<string | null>(null);
  const [expandedBairros, setExpandedBairros] = useState<Set<string>>(new Set());
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [grupoSelecionado, setGrupoSelecionado] = useState('');
  const [gruposPedidos, setGruposPedidos] = useState<Record<string, string[]>>({});
  const [modoRota, setModoRota] = useState<'manual' | 'proximidade'>('manual');
  const [perfil6mAlertas, setPerfil6mAlertas] = useState<Record<number, Perfil6mPedidoAlerta>>({});
  const [loadingPerfil6m, setLoadingPerfil6m] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  // Centro de Distribuicao Esplendor (Sobradinho - DF) - CEP 73.050-624
  const [baseCoords, setBaseCoords] = useState<[number, number]>([-15.6505305, -47.7724339]);
  const STORAGE_GRUPOS_KEY = 'roteirizacao_grupos_pedidos_v1';
  const [grupoAtivo, setGrupoAtivo] = useState('');

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
      maximumFractionDigits: 2
    }).format(peso)} kg`;
  };

  const parseNumber = (value: unknown) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const cleaned = value.trim().replace(/\./g, '').replace(',', '.');
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const formatQuantidade = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(Number.isFinite(value) ? value : 0);
  };

  const getPerfil6mAlerta = (nota: NotaExterna) => {
    return nota.orcamentoId ? perfil6mAlertas[nota.orcamentoId] : undefined;
  };

  const carregarAlertasPerfil6m = async (notasParaValidar: NotaExterna[]) => {
    const ids = Array.from(new Set(
      notasParaValidar
        .map((nota) => nota.orcamentoId)
        .filter((id): id is number => Number.isFinite(id))
    ));

    if (ids.length === 0) return;

    setLoadingPerfil6m(true);
    setPerfil6mAlertas((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = {
          pedidoId: id,
          hasPerfil6m: next[id]?.hasPerfil6m ?? false,
          totalQuantidade: next[id]?.totalQuantidade ?? 0,
          totalItensPedido: next[id]?.totalItensPedido ?? 0,
          itens: next[id]?.itens ?? [],
          loading: true
        };
      });
      return next;
    });

    try {
      const chunkSize = 20;
      const chunks: number[][] = [];
      for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize));
      }

      const merged: Record<string, Perfil6mPedidoAlerta> = {};
      for (const chunk of chunks) {
        const query = new URLSearchParams({ orcamento_ids: chunk.join(',') });
        const response = await fetch(`/api/pedidos/perfil-6m?${query}`, {
          headers: { accept: 'application/json' },
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Falha ao consultar perfil 6m (${response.status})`);
        }

        const payload: Perfil6mPedidosResponse = await response.json();
        Object.assign(merged, payload.data || {});
      }

      setPerfil6mAlertas((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = merged[String(id)]
            ? { ...merged[String(id)], loading: false }
            : {
                pedidoId: id,
                hasPerfil6m: false,
                totalQuantidade: 0,
                totalItensPedido: 0,
                itens: [],
                loading: false
              };
        });
        return next;
      });
    } catch (error) {
      console.error('Erro ao validar perfil 6m:', error);
      setPerfil6mAlertas((prev) => {
        const next = { ...prev };
        ids.forEach((id) => {
          next[id] = {
            pedidoId: id,
            hasPerfil6m: next[id]?.hasPerfil6m ?? false,
            totalQuantidade: next[id]?.totalQuantidade ?? 0,
            totalItensPedido: next[id]?.totalItensPedido ?? 0,
            itens: next[id]?.itens ?? [],
            error: 'Não foi possível validar perfil 6m',
            loading: false
          };
        });
        return next;
      });
    } finally {
      setLoadingPerfil6m(false);
    }
  };


  const notasAgrupadas = useMemo(() => {
    const grupos: Record<string, NotaExterna[]> = {};
    const notasFiltradas = mostrarApenasFalhas
      ? notas.filter(n => n.statusGeocoding === 'error')
      : notas;

    notasFiltradas.forEach(nota => {
      const bairro = nota.cliente?.bairro || 'Não Informado';
      if (!grupos[bairro]) grupos[bairro] = [];
      grupos[bairro].push(nota);
    });
    return grupos;
  }, [notas, mostrarApenasFalhas]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(STORAGE_GRUPOS_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Record<string, string[]>;
      if (parsed && typeof parsed === 'object') {
        setGruposPedidos(parsed);
      }
    } catch (error) {
      console.error('Erro ao carregar grupos salvos:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_GRUPOS_KEY, JSON.stringify(gruposPedidos));
  }, [gruposPedidos]);

  useEffect(() => {
    setManualOrder((prev) => {
      const next = [
        ...prev.filter((numero) => selecionadas.includes(numero)),
        ...selecionadas.filter((numero) => !prev.includes(numero)),
      ];
      return next;
    });
  }, [selecionadas]);

  const resumoSelecionadas = useMemo(() => {
    const selecionadasSet = new Set(selecionadas);
    const itens = notas.filter((nota) => selecionadasSet.has(nota.numero));
    return {
      quantidade: itens.length,
      valorTotal: itens.reduce((sum, nota) => sum + parseNumber(nota.valor), 0),
      pesoTotal: itens.reduce((sum, nota) => sum + parseNumber(nota.peso), 0),
    };
  }, [selecionadas, notas]);

  const mapCenterZoom = useMemo<{ center: [number, number]; zoom: number }>(() => {
    if (!selectedBairro || !notasAgrupadas[selectedBairro]) {
      return markers.length > 0
        ? { center: [markers[0].lat, markers[0].lng] as [number, number], zoom: 12 }
        : { center: baseCoords, zoom: 11 };
    }

    const bairroNotas = notasAgrupadas[selectedBairro];
    const bairroMarkers = markers.filter(m => bairroNotas.some(n => n.numero === m.id));

    if (bairroMarkers.length === 0) {
      return { center: baseCoords, zoom: 11 };
    }

    // Calcular centro medio
    const avgLat = bairroMarkers.reduce((sum, m) => sum + m.lat, 0) / bairroMarkers.length;
    const avgLng = bairroMarkers.reduce((sum, m) => sum + m.lng, 0) / bairroMarkers.length;

    // Calcular zoom baseado na dispersao (simples)
    const maxDist = Math.max(
      ...bairroMarkers.map(m => Math.sqrt((m.lat - avgLat) ** 2 + (m.lng - avgLng) ** 2))
    );
    const zoom = maxDist > 0.01 ? 14 : 16; // Ajustar conforme necessario

    return { center: [avgLat, avgLng] as [number, number], zoom };
  }, [selectedBairro, notasAgrupadas, markers, baseCoords]);

  const markersComRegiao = useMemo(() => {
    const novos = [...markers];

    Object.entries(gruposPedidos).forEach(([grupo, pedidos], idx) => {
      pedidos.forEach((numero) => {
        const marker = novos.find(m => m.id === numero);
        if (marker) {
          marker.color = cores[(idx + 2) % cores.length];
          marker.groupName = grupo;
        }
      });
    });

    return novos;
  }, [markers, gruposPedidos]);

  const resumoRota = useMemo(() => {
    const entregas = markers.filter((marker) => marker.type === 'delivery');
    return {
      totalEntregas: entregas.length,
      valorTotal: entregas.reduce((sum, marker) => sum + parseNumber(marker.valorPedido), 0),
      pesoTotal: entregas.reduce((sum, marker) => sum + parseNumber(marker.pesoPedido), 0),
    };
  }, [markers]);

  const handleCarregarEntregas = async (daysToLoad: number = 7) => {
    setLoadingEntregas(true);
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const inicio = format(subDays(new Date(), daysToLoad - 1), 'yyyy-MM-dd');

      enqueueSnackbar(`Carregando entregas de ${inicio} a ${hoje} (${daysToLoad} dia${daysToLoad > 1 ? 's' : ''})`, { variant: 'info' });

      const url = `/api/pedidos/externos?limit=200&offset=0&data_inicio=${inicio}&data_fim=${hoje}&tipo_entrega=EPG&status=FECHADO&tipo_data=recebimento`;

      const response = await axios.get(url);
      let pedidos = [];

      if (response.data?.data) {
        pedidos = response.data.data;
      } else if (response.data?.pedidos) {
        pedidos = response.data.pedidos;
      } else if (Array.isArray(response.data)) {
        pedidos = response.data;
      }

      if (pedidos.length === 0) {
        enqueueSnackbar(`Nenhum pedido de entrega fechado encontrado nos últimos ${daysToLoad} dias.`, { variant: 'info' });
        return;
      }

      const novasNotas: NotaExterna[] = pedidos.map((p: any) => ({
        numero: p.NUMERO_NOTA || String(p.ORCAMENTO_ID),
        serie: p.SERIE_NOTA || '1',
        orcamentoId: parseNumber(p.ORCAMENTO_ID || p.PEDIDO_ID || p.ID) || undefined,
        cliente: {
          nome: String(p.CLIENTE_NOME || p.NOME_FANTASIA || p.NOME || '').trim(),
          endereco: String(p.LOGRADOURO_ENTREGA || p.ENDERECO || p.LOGRADOURO || '').trim(),
          cidade: String(p.NOME_CIDADE || p.CIDADE || p.MUNICIPIO || '').trim(),
          estado: String(p.ESTADO_DESTINO || p.UF || p.ESTADO || p.ESTADO_NOTA_ID || '').trim(),
          cep: String(p.CEP || p.CEP_ENTREGA || '').replace(/\s+/g, ''),
          bairro: String(p.NOME_BAIRRO_NOTA || p.BAIRRO || p.NOME_BAIRRO || '').trim()
        },
        numeroEndereco: String(p.NUMERO_ENTREGA || p.NUMERO || '').trim(),
        complemento: String(p.COMPLEMENTO_ENTREGA || p.COMPLEMENTO || '').trim(),
        peso: parseNumber(p.PESO || p.PESO_NOTA || p.PESO_TOTAL || p.PESO_BRUTO),
        valor: parseNumber(p.VALOR_PEDIDO || p.VALOR_TOTAL || p.VALOR),
        tipoEntrega: String(p.TIPO_ENTREGA || '').trim()
      }));

      const notasSemBairro = novasNotas.filter(n => !n.cliente?.bairro || !n.cliente?.cidade);
      if (notasSemBairro.length > 0) {
        enqueueSnackbar(`Enriquecendo dados de ${notasSemBairro.length} notas via CEP...`, { variant: 'info' });

        for (const nota of notasSemBairro) {
          if (nota.cliente?.cep) {
            const data = await CEPService.buscarCEP(nota.cliente.cep);
            if (data) {
              nota.cliente.endereco = nota.cliente.endereco || data.logradouro || '';
              nota.cliente.bairro = nota.cliente.bairro || data.bairro || '';
              nota.cliente.cidade = nota.cliente.cidade || data.localidade || '';
              nota.cliente.estado = nota.cliente.estado || data.uf || '';
            }
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
      }

      setNotas(prev => {
        const existentes = new Set(prev.map(n => n.numero));
        const paraAdicionar = novasNotas.filter(n => !existentes.has(n.numero));
        if (paraAdicionar.length === 0) {
          enqueueSnackbar('Todas as entregas já estavam carregadas.', { variant: 'info' });
        }
        return [...prev, ...paraAdicionar];
      });

      void carregarAlertasPerfil6m(novasNotas);

      const novosNumeros = novasNotas.map(n => n.numero);
      setSelecionadas(prev => {
        const s = new Set([...prev, ...novosNumeros]);
        return Array.from(s);
      });

      enqueueSnackbar(`${novasNotas.length} entregas carregadas e selecionadas!`, { variant: 'success' });
    } catch (error) {
      console.error('Erro ao carregar entregas:', error);
      enqueueSnackbar('Erro ao carregar entregas. Verifique a conexão.', { variant: 'error' });
    } finally {
      setLoadingEntregas(false);
    }
  };

  const handleBuscar = async () => {
    if (!busca) return;
    setLoading(true);
    try {
      // Usando a API existente de buscar-nota-externa
      const response = await axios.get(`/api/buscar-nota-externa?numero=${busca}`);
      if (response.data) {
        // Se retornar uma unica nota, transformamos em array
        const novaNota = response.data;
        if (!notas.find(n => n.numero === novaNota.numero)) {
          const notaMapeada: NotaExterna = {
            ...novaNota,
            numero: novaNota.NUMERO_NOTA || novaNota.numero,
            numeroEndereco: novaNota.NUMERO_ENTREGA || novaNota.NUMERO,
            complemento: novaNota.COMPLEMENTO_ENTREGA || novaNota.COMPLEMENTO,
          };
          setNotas(prev => [...prev, notaMapeada]);
          enqueueSnackbar('Nota encontrada e adicionada à lista.', { variant: 'success' });

        } else {
          enqueueSnackbar('Nota já está na lista.', { variant: 'info' });
        }
      } else {
        enqueueSnackbar('Nota não encontrada.', { variant: 'warning' });
      }
    } catch (error) {
      console.error('Erro ao buscar nota:', error);
      enqueueSnackbar('Erro ao buscar nota.', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNota = (numeroNota: string) => {
    setSelecionadas((prev) => {
      const exists = prev.includes(numeroNota);
      if (exists) {
        const updated = prev.filter((item) => item !== numeroNota);
        setManualOrder((current) => current.filter((item) => item !== numeroNota));
        return updated;
      }
      const updated = [...prev, numeroNota];
      setManualOrder((current) => (current.includes(numeroNota) ? current : [...current, numeroNota]));
      return updated;
    });
  };

  const handleSalvarGrupoSelecionado = () => {
    const nome = nomeGrupo.trim();
    if (!nome) {
      enqueueSnackbar('Informe um nome para o grupo.', { variant: 'warning' });
      return;
    }
    if (selecionadas.length === 0) {
      enqueueSnackbar('Selecione pedidos antes de salvar o grupo.', { variant: 'warning' });
      return;
    }
    setGruposPedidos((prev) => ({
      ...prev,
      [nome]: [...selecionadas],
    }));
    setGrupoSelecionado(nome);
    setGrupoAtivo(nome);
    enqueueSnackbar(`Grupo "${nome}" salvo com ${selecionadas.length} pedidos.`, { variant: 'success' });
  };

  const handleAplicarGrupo = (nomeGrupoParam = grupoSelecionado) => {
    if (!nomeGrupoParam || !gruposPedidos[nomeGrupoParam]) {
      enqueueSnackbar('Selecione um grupo válido para aplicar.', { variant: 'warning' });
      return;
    }
    const itens = gruposPedidos[nomeGrupoParam];
    setSelecionadas(itens);
    setManualOrder(itens);
    setGrupoSelecionado(nomeGrupoParam);
    setGrupoAtivo(nomeGrupoParam);
    setExpandedBairros(new Set(notas
      .filter((nota) => itens.includes(nota.numero))
      .map((nota) => nota.cliente?.bairro || 'Não Informado')));
    enqueueSnackbar(`Grupo "${nomeGrupoParam}" aberto com ${itens.length} pedidos.`, { variant: 'success' });
  };

  const handleRemoverGrupo = () => {
    if (!grupoSelecionado || !gruposPedidos[grupoSelecionado]) {
      enqueueSnackbar('Selecione um grupo para remover.', { variant: 'warning' });
      return;
    }
    const nome = grupoSelecionado;
    setGruposPedidos((prev) => {
      const next = { ...prev };
      delete next[nome];
      return next;
    });
    setGrupoSelecionado('');
    if (grupoAtivo === nome) {
      setGrupoAtivo('');
    }
    enqueueSnackbar(`Grupo "${nome}" removido.`, { variant: 'info' });
  };

  const handleMapMarkerClick = (mapMarkers: MapMarker[]) => {
    const ids = mapMarkers
      .filter((marker) => marker.type === 'delivery' && marker.id)
      .map((marker) => marker.id as string);

    if (ids.length === 0) return;

    setSelecionadas(ids);
    setManualOrder(ids);
    setExpandedBairros(new Set(notas
      .filter((nota) => ids.includes(nota.numero))
      .map((nota) => nota.cliente?.bairro || 'Não Informado')));
  };

  const handleMarkerMove = (id: string, lat: number, lng: number) => {
    if (id === 'base') {
      setBaseCoords([lat, lng]);
      setMarkers((prev) => prev.map((marker) => marker.id === id ? { ...marker, lat, lng } : marker));
      setRouteWaypoints((prev) => prev.length ? [[lat, lng], ...prev.slice(1)] : prev);
      setRouteGeometry([]);
      enqueueSnackbar('Ponto de partida ajustado. Gere a rota novamente para recalcular o trajeto.', { variant: 'info' });
      return;
    }

    setMarkers((prev) => {
      const updated = prev.map((marker) => marker.id === id ? { ...marker, lat, lng } : marker);
      const orderedDeliveries = updated.filter((marker) => marker.type === 'delivery');
      setRouteWaypoints([
        baseCoords,
        ...orderedDeliveries.map((marker) => [marker.lat, marker.lng] as [number, number])
      ]);
      return updated;
    });

    setNotas((prev) => prev.map((nota) => nota.numero === id
      ? { ...nota, coords: { lat, lng }, statusGeocoding: 'success' }
      : nota));
    setRouteGeometry([]);
    enqueueSnackbar('Ponto de entrega ajustado. Gere a rota novamente para recalcular o trajeto.', { variant: 'info' });
  };

  const haversineDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const ordenarPorProximidade = (entregas: MapMarker[]) => {
    const unvisited = [...entregas];
    const ordered: MapMarker[] = [];
    let current: [number, number] = baseCoords;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = haversineDistanceKm(current[0], current[1], unvisited[i].lat, unvisited[i].lng);
        if (d < minDist) {
          minDist = d;
          nearestIndex = i;
        }
      }

      const nearest = unvisited.splice(nearestIndex, 1)[0];
      ordered.push(nearest);
      current = [nearest.lat, nearest.lng];
    }

    return ordered;
  };

  const handleGerarRota = async () => {
    if (selecionadas.length === 0) {
      enqueueSnackbar('Selecione pelo menos uma nota.', { variant: 'warning' });
      return;
    }
    setGeocoding(true);
    const novasMarkers: MapMarker[] = [];
    const waypoints: [number, number][] = [];
    const manualSequence = [
      ...manualOrder.filter((numero) => selecionadas.includes(numero)),
      ...selecionadas.filter((numero) => !manualOrder.includes(numero)),
    ];
    const selecionadasOrdenadas = modoRota === 'manual' ? manualSequence : [...selecionadas];
    if (modoRota === 'manual') {
      setManualOrder(manualSequence);
    }
    waypoints.push(baseCoords);
    novasMarkers.push({
      lat: baseCoords[0],
      lng: baseCoords[1],
      label: 'CD: Esplendor Atacadista',
      details: 'Ponto de partida: Área Especial para Indústria 11, Lote 11 a 14, Galpão 03 - Sobradinho, Brasília - DF',
      id: 'base',
      type: 'start'
    });
    let successCount = 0;
    let errorCount = 0;
    try {
      for (let i = 0; i < selecionadasOrdenadas.length; i++) {
        const numero = selecionadasOrdenadas[i];
        const nota = notas.find((n) => n.numero === numero);
        if (!nota || !nota.cliente) {
          continue;
        }
        setNotas((prev) => prev.map((n) => n.numero === nota.numero ? { ...n, statusGeocoding: 'loading' } : n));
        if (i % 5 === 0) {
          enqueueSnackbar(`Localizando endereços... ${i + 1}/${selecionadasOrdenadas.length}`, { variant: 'info', autoHideDuration: 2000 });
        }
        let bairro = nota.cliente.bairro;
        let cidade = nota.cliente.cidade;
        if (nota.cliente.cep && (!bairro || !cidade)) {
          console.log(`[Roteirizacao] CEP enrichment for note ${nota.numero}`);
          const cepData = await CEPService.buscarCEP(nota.cliente.cep);
          if (cepData) {
            bairro = bairro || cepData.bairro || '';
            cidade = cidade || cepData.localidade || '';
            if (!nota.cliente.estado) nota.cliente.estado = cepData.uf || '';
            setNotas((prev) => prev.map((n) => n.numero === nota.numero ? {
              ...n,
              cliente: {
                ...n.cliente,
                endereco: n.cliente?.endereco || cepData.logradouro || '',
                bairro,
                cidade,
                estado: n.cliente?.estado || cepData.uf || ''
              }
            } : n));
          }
        }
        if (!cidade && (nota.cliente.estado === 'DF' || !nota.cliente.estado)) {
          cidade = 'Brasilia';
          if (!nota.cliente.estado) nota.cliente.estado = 'DF';
        }

        const logradouroComNumero = `${nota.cliente.endereco}${nota.numeroEndereco ? ' ' + nota.numeroEndereco : ''}`;
        const cidadeBusca = cidade ? cidade.replace(/^Brasilia$/i, 'Brasília') : cidade;
        const enderecoStr = [
          logradouroComNumero,
          bairro,
          cidadeBusca,
          nota.cliente.estado,
          nota.cliente.cep
        ]
          .filter(Boolean)
          .map((s) => String(s).trim())
          .filter((s) => s !== '' && s !== 'undefined')
          .join(', ');

        console.log(`[Roteirizacao] Geocodificando (${i + 1}/${selecionadasOrdenadas.length}): ${enderecoStr}`);

        const coords = await GeocodingService.geocode(enderecoStr);
        if (coords) {
          const valorPedido = parseNumber(nota.valor);
          const pesoPedido = parseNumber(nota.peso);
          const alertaPerfil6m = getPerfil6mAlerta(nota);
          const perfil6mResumo = alertaPerfil6m?.loading
            ? '\nATENÇÃO Perfil 6m: validando...'
            : alertaPerfil6m?.hasPerfil6m
              ? `\nATENÇÃO Perfil 6m: ${formatQuantidade(alertaPerfil6m.totalQuantidade)} un.`
              : '';

          setNotas((prev) => prev.map((n) => n.numero === nota.numero ? {
            ...n,
            statusGeocoding: 'success',
            coords: { lat: coords.lat, lng: coords.lng }
          } : n));

          novasMarkers.push({
            lat: coords.lat,
            lng: coords.lng,
            label: `NFe ${nota.numero}`,
            details: `Cliente: ${nota.cliente.nome}\nPedido: ${nota.orcamentoId || '---'}\nEndereço: ${logradouroComNumero}\nBairro: ${nota.cliente.bairro}\nCidade: ${nota.cliente.cidade}\nEstado: ${nota.cliente.estado}\nCEP: ${nota.cliente.cep}\nValor: ${formatCurrency(valorPedido)}\nPeso: ${formatPeso(pesoPedido)}${perfil6mResumo}\nLocalização: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
            id: nota.numero,
            type: 'delivery',
            valorPedido,
            pesoPedido,
            clienteNome: nota.cliente.nome || '',
            bairro: nota.cliente.bairro || '',
            cidade: nota.cliente.cidade || '',
            orcamentoId: nota.orcamentoId
          });

          waypoints.push([coords.lat, coords.lng]);
          successCount++;
        } else {
          setNotas((prev) => prev.map((n) => n.numero === nota.numero ? {
            ...n,
            statusGeocoding: 'error',
            erroMensagem: 'Endereco nao encontrado (tentado: completo, sem numero e CEP)'
          } : n));
          console.warn(`[Roteirizacao] Não foi possível encontrar coordenadas para: ${enderecoStr}`);
          errorCount++;
        }
        if (i < selecionadasOrdenadas.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1100));
        }
      }
      const markerBase = novasMarkers.find((marker) => marker.type === 'start');
      const entregas = novasMarkers.filter((marker) => marker.type === 'delivery');
      const entregasOrdenadas = modoRota === 'proximidade' ? ordenarPorProximidade(entregas) : entregas;
      const entregasComSequencia = entregasOrdenadas.map((marker, index) => ({
        ...marker,
        sequence: index + 1,
      }));
      const markersFinais = markerBase ? [markerBase, ...entregasComSequencia] : entregasComSequencia;
      const waypointsFinais: [number, number][] = [
        baseCoords,
        ...entregasComSequencia.map((marker) => [marker.lat, marker.lng] as [number, number])
      ];
      setMarkers(markersFinais);
      setRouteWaypoints(waypointsFinais);
      const ordemAtualizada = entregasComSequencia
        .map((marker) => marker.id)
        .filter(Boolean) as string[];
      if (ordemAtualizada.length > 0) {
        setManualOrder(ordemAtualizada);
        if (modoRota === 'proximidade') {
          setSelecionadas(ordemAtualizada);
        }
      }
      if (waypointsFinais.length >= 2) {
        try {
          const routeResult = await RoutingService.calculateRoute(waypointsFinais);
          setRouteGeometry([{
            geometry: routeResult.geometry.map((c: [number, number]) => [c[1], c[0]]),
            regiao: 0,
            distance: routeResult.distance,
            duration: routeResult.duration
          }]);
        } catch (routeError: any) {
          console.error('Erro ao calcular rota:', routeError);
          if (routeError.message.includes('25 waypoints')) {
            enqueueSnackbar('Rota muito grande. Selecione no máximo 25 pontos para otimização.', { variant: 'warning' });
          } else {
            enqueueSnackbar('Erro ao calcular rota otimizada. Usando linhas retas.', { variant: 'error' });
          }
          setRouteGeometry([]);
        }
      } else {
        setRouteGeometry([]);
      }
      if (waypointsFinais.length > 1) {
        if (errorCount > 0) {
          enqueueSnackbar(`Rota gerada! ${successCount} entregas localizadas, ${errorCount} com erro.`, { variant: 'warning', autoHideDuration: 5000 });
        } else {
          enqueueSnackbar(`Rota gerada com sucesso! ${successCount} entregas localizadas.`, { variant: 'success' });
        }
      }
    } catch (error) {
      console.error('Erro na geocodificação:', error);
      enqueueSnackbar('Erro ao processar endereços.', { variant: 'error' });
    } finally {
      setGeocoding(false);
    }
  };

  const handleRoutingError = (error: any) => {
    console.error('Erro de roteirização capturado:', error);
    const message = error?.message || '';
    if (message.includes('timed out')) {
      enqueueSnackbar('O servidor de rotas demorou muito para responder. Tente selecionar menos notas.', { 
        variant: 'error',
        autoHideDuration: 8000
      });
    } else {
      enqueueSnackbar('Erro ao calcular o trajeto. Verifique a conexão ou tente novamente.', { variant: 'error' });
    }
  };


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setManualOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newItems = arrayMove(items, oldIndex, newIndex);
        setSelecionadas(newItems);
        return newItems;
      });
    }
  };

  const handleImprimir = () => {

    if (markers.length <= 1) {
      enqueueSnackbar('Gere uma rota no mapa primeiro para imprimir.', { variant: 'info' });
      return;
    }
    window.print();
  };

  const limparTudo = () => {

    setNotas([]);
    setSelecionadas([]);
    setMarkers([]);
    setRouteWaypoints([]);
    setRouteGeometry([]);
    setPerfil6mAlertas({});
    setBusca('');
    setSelectedBairro(null);
  };

  const handleShareLocation = async (nota: NotaExterna) => {
    const marker = markers.find(m => m.id === nota.numero);
    if (!marker) {
      enqueueSnackbar('Localização não disponível. Gere a rota primeiro.', { variant: 'warning' });
      return;
    }

    const googleMapsUrl = `https://www.google.com/maps?q=${marker.lat},${marker.lng}`;
    const shareText = `Entrega NFe ${nota.numero} - ${nota.cliente?.nome || 'Cliente'}\n${nota.cliente?.endereco || ''}, ${nota.cliente?.bairro || ''}, ${nota.cliente?.cidade || ''}\n${googleMapsUrl}`;

    // Tentar usar a Web Share API (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Entrega NFe ${nota.numero}`,
          text: shareText,
          url: googleMapsUrl
        });
        return;
      } catch {
        // Usuario cancelou ou nao suportado, tentar copiar
      }
    }

    // Fallback: copiar para a area de transferencia
    try {
      await navigator.clipboard.writeText(shareText);
      enqueueSnackbar('Link de localização copiado!', { variant: 'success' });
    } catch {
      enqueueSnackbar('Não foi possível compartilhar a localização.', { variant: 'error' });
    }
  };

  return (
    <AppLayout title="Roteirização Inteligente" subtitle="Otimização de rotas para entregas" fluid>
      <Container maxWidth="xl" sx={{ py: 2 }}>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>

        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" sx={{ '& .MuiButton-root': { minHeight: 34 } }}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="caption" color="text.secondary" fontWeight={700}>Carregar:</Typography>
            <ToggleButtonGroup
              value={daysToLoad}
              exclusive
              onChange={(e, val) => val && setDaysToLoad(val)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 1,
                  py: 0.45,
                  fontSize: '0.72rem',
                  lineHeight: 1.1
                }
              }}
            >
              <ToggleButton value={1}>Hoje</ToggleButton>
              <ToggleButton value={3}>3 dias</ToggleButton>
              <ToggleButton value={7}>7 dias</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={loadingEntregas ? <CircularProgress size={16} color="inherit" /> : <ShippingIcon fontSize="small" />}
            onClick={() => handleCarregarEntregas(daysToLoad)}
            disabled={loadingEntregas}
            sx={{
              borderRadius: '9px',
              px: 1.5,
              py: 0.7,
              fontWeight: 800,
              fontSize: '0.76rem',
              boxShadow: '0 3px 10px rgba(37, 99, 235, 0.22)'
            }}
          >
            {loadingEntregas ? 'Carregando...' : `Entregas (${daysToLoad}d)`}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon fontSize="small" />}
            onClick={limparTudo}
            sx={{ borderRadius: '9px', px: 1.25, fontSize: '0.75rem' }}
          >
            Limpar
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<RouteIcon fontSize="small" />}
            onClick={handleImprimir}
            disabled={markers.length <= 1}
            sx={{ borderRadius: '9px', px: 1.25, fontSize: '0.75rem' }}
          >
            PDF
          </Button>
        </Box>
      </Box>



      <Grid container spacing={3}>
        {/* Painel de seleção abaixo do mapa */}
        <Grid item xs={12} md={12} sx={{ order: { xs: 2, md: 2 } }}>
          <Card sx={{ height: '100%', borderRadius: '16px', boxShadow: 3 }}>
            <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mb={1.5} flexWrap="wrap">
                <Typography variant="subtitle1" fontWeight="700">
                  Selecionar Entregas
                </Typography>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${selecionadas.length}/${notas.length} selecionadas`}
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              
              <Box display="flex" gap={1} mb={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Número da Nota"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && handleBuscar()}
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  }}
                />
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={handleBuscar}
                  disabled={loading}
                  sx={{ minWidth: 64, borderRadius: '9px', fontWeight: 800 }}
                >
                  {loading ? <CircularProgress size={18} color="inherit" /> : 'Add'}
                </Button>
              </Box>

              <Divider sx={{ mb: 1.5 }} />

              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  Resumo da seleção
                </Typography>
                <Box display="flex" gap={1} alignItems="center">
                  {loadingPerfil6m && (
                    <Chip
                      size="small"
                      label="Atenção: validando perfil 6m..."
                      variant="outlined"
                      sx={{
                        fontSize: '10px',
                        color: perfil6mOrangeDark,
                        borderColor: perfil6mOrange,
                        bgcolor: perfil6mOrangeBg,
                        fontWeight: 800
                      }}
                    />
                  )}
                  <Chip 
                    size="small" 
                    label="Falhas" 
                    color="error" 
                    clickable
                    onClick={() => setMostrarApenasFalhas(!mostrarApenasFalhas)}
                    variant={mostrarApenasFalhas ? 'filled' : 'outlined'}
                    sx={{ fontSize: '10px' }}
                  />

                </Box>
              </Box>

              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`Selecionadas: ${resumoSelecionadas.quantidade}`}
                />
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label={`Valor: ${formatCurrency(resumoSelecionadas.valorTotal)}`}
                />
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  label={`Peso: ${formatPeso(resumoSelecionadas.pesoTotal)}`}
                />
              </Box>

              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: '10px',
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default'
                }}
              >
                <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                  Planejamento de rota
                </Typography>

                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Modo da rota"
                  value={modoRota}
                  onChange={(e) => setModoRota(e.target.value as 'manual' | 'proximidade')}
                  sx={{ mb: 1 }}
                >
                  <MenuItem value="manual">Manual (ordem definida pelo usuário)</MenuItem>
                  <MenuItem value="proximidade">Automática por proximidade</MenuItem>
                </TextField>

                <Box display="flex" gap={1} mb={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Nome do grupo"
                    value={nomeGrupo}
                    onChange={(e) => setNomeGrupo(e.target.value)}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleSalvarGrupoSelecionado}
                  >
                    Salvar
                  </Button>
                </Box>

                <Box display="flex" gap={1}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Grupo salvo"
                    value={grupoSelecionado}
                    onChange={(e) => setGrupoSelecionado(e.target.value)}
                  >
                    <MenuItem value="">Selecione</MenuItem>
                    {Object.keys(gruposPedidos).map((grupo) => (
                      <MenuItem key={grupo} value={grupo}>
                        {grupo} ({gruposPedidos[grupo]?.length || 0})
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleAplicarGrupo()}
                    disabled={!grupoSelecionado}
                  >
                    Aplicar
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={handleRemoverGrupo}
                    disabled={!grupoSelecionado}
                  >
                    Excluir
                  </Button>
                </Box>

                {Object.keys(gruposPedidos).length > 0 && (
                  <Box mt={1.5}>
                    <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 1 }}>
                      Agrupamentos
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {Object.entries(gruposPedidos).map(([grupo, pedidos]) => (
                        <Chip
                          key={grupo}
                          size="small"
                          clickable
                          color={grupoAtivo === grupo ? 'primary' : 'default'}
                          variant={grupoAtivo === grupo ? 'filled' : 'outlined'}
                          label={`${grupo} (${pedidos.length})`}
                          onClick={() => handleAplicarGrupo(grupo)}
                          sx={{ fontWeight: 700 }}
                        />
                      ))}
                    </Box>
                    {grupoAtivo && gruposPedidos[grupoAtivo] && (
                      <Box mt={1.5} sx={{ maxHeight: 150, overflowY: 'auto' }}>
                        {gruposPedidos[grupoAtivo].map((numero) => {
                          const pedido = notas.find((nota) => nota.numero === numero);
                          return (
                            <Box
                              key={numero}
                              sx={{
                                p: 1,
                                mb: 0.75,
                                borderRadius: '8px',
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider'
                              }}
                            >
                              <Typography variant="caption" fontWeight={800} display="block">
                                Pedido {pedido?.orcamentoId || numero}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                {pedido?.cliente?.nome || 'Cliente não informado'}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>

              <List sx={{ maxHeight: '420px', overflowY: 'auto', pr: 1 }}>
                {Object.entries(notasAgrupadas).map(([bairro, notasDoBairro]) => (
                  <React.Fragment key={bairro}>
                    <ListSubheader
                      sx={{
                        bgcolor: 'background.paper',
                        lineHeight: '32px',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        color: selectedBairro === bairro ? 'secondary.main' : 'primary.main',
                        borderBottom: '1px solid #f0f0f0',
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onClick={() => {
                        setSelectedBairro(selectedBairro === bairro ? null : bairro);
                        setExpandedBairros(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(bairro)) {
                            newSet.delete(bairro);
                          } else {
                            newSet.add(bairro);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <span>{bairro} ({notasDoBairro.length})</span>
                      {expandedBairros.has(bairro) ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </ListSubheader>
                    {expandedBairros.has(bairro) && notasDoBairro.map((nota) => {
                      const alertaPerfil6m = getPerfil6mAlerta(nota);
                      return (
                      <ListItem 
                        key={nota.numero} 
                        disablePadding
                        sx={{ 
                          mb: 1, 
                          borderRadius: '8px', 
                          bgcolor: selecionadas.includes(nota.numero) ? 'action.selected' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <Checkbox
                          checked={selecionadas.includes(nota.numero)}
                          onChange={() => handleToggleNota(nota.numero)}
                        />
                        <ListItemText
                          primary={`Nota ${nota.numero}`}
                          secondary={
                            <Box component="span">
                              <Typography variant="caption" display="block" noWrap>
                                {nota.cliente?.nome}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {nota.cliente?.bairro} {nota.cliente?.cidade ? ` - ${nota.cliente.cidade}` : ''}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 500 }}>
                                Valor: {formatCurrency(nota.valor)} | Peso: {formatPeso(nota.peso)}
                              </Typography>
                              {nota.coords && (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '10px' }}>
                                  Lat/Lng: {nota.coords.lat.toFixed(5)}, {nota.coords.lng.toFixed(5)}
                                </Typography>
                              )}
                              {alertaPerfil6m?.loading && (
                                <Chip
                                  size="small"
                                  label="Atenção: validando perfil 6m..."
                                  variant="outlined"
                                  sx={{
                                    mt: 0.5,
                                    height: 18,
                                    fontSize: '10px',
                                    color: perfil6mOrangeDark,
                                    borderColor: perfil6mOrange,
                                    bgcolor: perfil6mOrangeBg,
                                    fontWeight: 800
                                  }}
                                />
                              )}
                              {!alertaPerfil6m?.loading && alertaPerfil6m?.hasPerfil6m && (
                                <Box mt={0.5}>
                                  <Chip
                                    size="small"
                                    label={`Atenção perfil 6m: ${formatQuantidade(alertaPerfil6m.totalQuantidade)}`}
                                    sx={{
                                      height: 20,
                                      fontSize: '10px',
                                      fontWeight: 900,
                                      color: '#fff',
                                      bgcolor: perfil6mOrange,
                                      '& .MuiChip-label': { px: 1 }
                                    }}
                                  />
                                  {alertaPerfil6m.itens.slice(0, 2).map((item, idx) => (
                                    <Typography key={`${item.produtoNome}-${idx}`} variant="caption" display="block" sx={{ fontSize: '10px', mt: 0.25, color: perfil6mOrangeDark, fontWeight: 700 }}>
                                      {item.produtoNome} ({formatQuantidade(item.quantidade)})
                                    </Typography>
                                  ))}
                                </Box>
                              )}


                              {nota.statusGeocoding === 'error' && (
                                <Box mt={0.5}>
                                  <Typography variant="caption" color="error.main" sx={{ display: 'block', fontSize: '10px', fontStyle: 'italic', fontWeight: 'bold' }}>
                                    {nota.erroMensagem}
                                  </Typography>
                                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', fontSize: '9px' }}>
                                    Env: {nota.cliente?.endereco}, {nota.cliente?.bairro}, {nota.cliente?.cidade}, {nota.cliente?.cep}
                                  </Typography>
                                </Box>
                              )}

                            </Box>
                          }
                        />

                        {nota.statusGeocoding === 'loading' && <CircularProgress size={16} sx={{ ml: 1 }} />}
                        {nota.statusGeocoding === 'success' && (
                          <Box display="flex" alignItems="center" gap={0.5} ml={1}>
                            <Chip size="small" label="OK" color="success" variant="outlined" sx={{ fontSize: '9px', height: '18px' }} />
                            <MuiTooltip title="Compartilhar localização">
                              <IconButton size="small" onClick={() => handleShareLocation(nota)} sx={{ p: 0.3 }}>
                                <ShareIcon sx={{ fontSize: '14px', color: 'secondary.main' }} />
                              </IconButton>
                            </MuiTooltip>
                          </Box>
                        )}
                        {nota.statusGeocoding === 'error' && <Chip size="small" label="Erro" color="error" variant="outlined" sx={{ ml: 1, fontSize: '9px', height: '18px' }} />}
                      </ListItem>
                    );
                    })}
                  </React.Fragment>
                ))}
                
                {notas.length === 0 && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    Busque e adicione notas para começar
                  </Typography>
                )}
              </List>


              {selecionadas.length > 0 && (
                <Box mt={3}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Ordem da Rota (Arraste para reordenar)
                  </Typography>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={manualOrder} strategy={verticalListSortingStrategy}>
                      <List sx={{ maxHeight: '200px', overflowY: 'auto', pr: 1 }}>
                        {manualOrder.map((numero) => {
                          const nota = notas.find(n => n.numero === numero);
                          return (
                            <SortableItem key={numero} id={numero}>
                              <ListItem
                                sx={{
                                  mb: 1,
                                  borderRadius: '8px',
                                  bgcolor: 'action.selected',
                                  '&:hover': { bgcolor: 'action.hover' },
                                  cursor: 'grab',
                                  '&:active': { cursor: 'grabbing' }
                                }}
                              >
                                <DragIndicatorIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                <ListItemText
                                  primary={`Nota ${nota?.numero}`}
                                  secondary={`${nota?.cliente?.nome} - ${nota?.cliente?.bairro}`}
                                />
                              </ListItem>
                            </SortableItem>
                          );
                        })}
                      </List>
                    </SortableContext>
                  </DndContext>
                </Box>
              )}

              <Box mt={3}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="medium"
                  startIcon={geocoding ? <CircularProgress size={18} color="inherit" /> : <MapIcon fontSize="small" />}
                  onClick={handleGerarRota}
                  disabled={selecionadas.length === 0 || geocoding}
                  sx={{ borderRadius: '10px', py: 1, fontWeight: 800 }}
                >
                  {geocoding ? 'Localizando...' : 'Visualizar no Mapa'}
                </Button>
              </Box>

            </CardContent>
          </Card>
        </Grid>

        {/* Mapa */}
        <Grid item xs={12} md={12} sx={{ order: { xs: 1, md: 1 } }}>
          <Card sx={{ height: '100%', borderRadius: '16px', boxShadow: 3, overflow: 'hidden' }}>
            <Box p={2} bgcolor="primary.main" color="white" display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <LocationOnIcon />
                <Typography variant="subtitle1" fontWeight="600">
                  {geocoding ? 'Localizando Endereços...' : 'Mapa de Entregas'}
                </Typography>
              </Box>
              <Box display="flex" gap={1} alignItems="center">
                {geocoding && (
                  <CircularProgress size={16} sx={{ color: 'white' }} />
                )}
                {routeWaypoints.length > 0 && (
                  <>
                    <Chip
                      label={`${resumoRota.totalEntregas} entregas`}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
                    />
                    <Chip
                      label={formatCurrency(resumoRota.valorTotal)}
                      size="small"
                      sx={{ bgcolor: 'rgba(16,185,129,0.25)', color: 'white', fontWeight: 'bold' }}
                    />
                    <Chip
                      label={formatPeso(resumoRota.pesoTotal)}
                      size="small"
                      sx={{ bgcolor: 'rgba(59,130,246,0.25)', color: 'white', fontWeight: 'bold' }}
                    />
                  </>
                )}
              </Box>
            </Box>
            <Box sx={{ height: '600px', position: 'relative' }}>
              <Map
                markers={markersComRegiao}
                routeWaypoints={routeWaypoints}
                routeGeometry={routeGeometry}
                height="600px"
                center={mapCenterZoom.center}
                zoom={mapCenterZoom.zoom}
                onRoutingError={handleRoutingError}
                onMarkerMove={handleMarkerMove}
                onMarkerClick={handleMapMarkerClick}
              />
            </Box>

          </Card>
        </Grid>
      </Grid>

      {/* Seção invisível na tela, mas que aparece no PDF/Impressão */}
      <Box className="print-only" sx={{ mt: 4, display: 'none' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
          Relatório de Rota de Entrega
        </Typography>
        <Typography variant="subtitle1" gutterBottom color="text.secondary">
          Gerado em: {format(new Date(), 'dd/MM/yyyy HH:mm')}
        </Typography>
        <Divider sx={{ my: 3, borderBottomWidth: 2 }} />
        
        {(() => {
          // Agrupar markers por bairro
          const markersPorBairro: Record<string, typeof markers> = {};
          markers.forEach(m => {
            if (m.type === 'start') return; // Ponto de partida separado
            const nota = notas.find(n => n.numero === m.id);
            const bairro = nota?.cliente?.bairro || 'Não Informado';
            if (!markersPorBairro[bairro]) markersPorBairro[bairro] = [];
            markersPorBairro[bairro].push(m);
          });

          return (
            <>
              {/* Ponto de Partida */}
              {markers.filter(m => m.type === 'start').map((m, i) => (
                <ListItem key={`start-${i}`} sx={{ display: 'block', mb: 3, borderBottom: '1px solid #eee', pb: 2 }}>
                  <Box display="flex" alignItems="center" gap={2} mb={1}>
                    <Box sx={{
                      bgcolor: 'success.main',
                      color: 'white',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold'
                    }}>
                      P
                    </Box>
                    <Typography variant="h6" fontWeight="bold">
                      PONTO DE PARTIDA - {m.label}
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', ml: 6 }}>
                    {m.details}
                  </Typography>
                </ListItem>
              ))}

              {/* Rotas por Bairro */}
              {Object.entries(markersPorBairro).map(([bairro, bairroMarkers], bairroIndex) => (
                <Box key={bairro} sx={{ mb: 4 }}>
                  <Typography variant="h5" fontWeight="bold" color="primary" sx={{ mb: 2, mt: 3 }}>
                    Rota {bairroIndex + 1}: {bairro} ({bairroMarkers.length} entregas)
                  </Typography>
                  <List>
                    {bairroMarkers.map((m, i) => (
                      <ListItem key={`${bairro}-${i}`} sx={{ display: 'block', mb: 2, borderBottom: '1px dashed #ccc', pb: 1 }}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <Box sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '12px'
                          }}>
                            {i + 1}
                          </Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {m.label}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', ml: 5, color: 'text.secondary' }}>
                          {m.details}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ))}
            </>
          );
        })()}
        
        <Box mt={4} pt={4} borderTop="1px dashed #ccc" textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Sistema Control Carga - Roteirização Automática
          </Typography>
        </Box>
      </Box>

    </Container>

    {/* Estilo para impressão do relatório */}
    <style jsx global>{`
      @media print {
        header, footer, .MuiDrawer-root, .MuiAppBar-root, button, nav, aside {
          display: none !important;
        }
        .MuiContainer-root {
          width: 100% !important;
          max-width: none !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        .MuiGrid-container {
          display: block !important;
        }
        .MuiGrid-item {
          width: 100% !important;
          max-width: none !important;
          display: block !important;
        }
        .no-print {
          display: none !important;
        }
        .print-only {
          display: block !important;
        }
        .MuiPaper-root {
          box-shadow: none !important;
          border: none !important;
        }
      }
      .print-only {
        display: none;
      }
    `}</style>
    </AppLayout>
  );
};


// Adicionando flag para usar o layout administrativo
(RoteirizacaoPage as any).usesAppLayout = true;

export default RoteirizacaoPage;
