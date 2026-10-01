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

interface RouteMetrics {
  distanciaIda: number;
  distanciaVolta: number;
  distanciaTotal: number;
  duracaoIda: number;
  duracaoVolta: number;
  duracaoTotal: number;
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
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [mostrarApenasFalhas, setMostrarApenasFalhas] = useState(false);
  const [mostrarSomenteSelecionadas, setMostrarSomenteSelecionadas] = useState(false);
  const [filtroSelecao, setFiltroSelecao] = useState('');
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

  const formatDistance = (meters?: number) => {
    return RoutingService.formatDistance(Number.isFinite(meters as number) ? Number(meters) : 0);
  };

  const formatDuration = (seconds?: number) => {
    return RoutingService.formatDuration(Number.isFinite(seconds as number) ? Number(seconds) : 0);
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


  const selecionadasSet = useMemo(() => new Set(selecionadas), [selecionadas]);

  const notasFiltradas = useMemo(() => {
    const termo = filtroSelecao.trim().toLowerCase();
    const base = (mostrarApenasFalhas
      ? notas.filter((nota) => nota.statusGeocoding === 'error')
      : notas
    ).filter((nota) => {
      if (mostrarSomenteSelecionadas && !selecionadasSet.has(nota.numero)) {
        return false;
      }

      if (!termo) return true;

      const textoBusca = [
        nota.numero,
        nota.orcamentoId,
        nota.cliente?.nome,
        nota.cliente?.bairro,
        nota.cliente?.cidade,
        nota.cliente?.endereco,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return textoBusca.includes(termo);
    });

    return [...base].sort((a, b) => {
      const aSelecionada = selecionadasSet.has(a.numero) ? 1 : 0;
      const bSelecionada = selecionadasSet.has(b.numero) ? 1 : 0;
      if (aSelecionada !== bSelecionada) return bSelecionada - aSelecionada;

      const bairroA = a.cliente?.bairro || '';
      const bairroB = b.cliente?.bairro || '';
      const bairroCompare = bairroA.localeCompare(bairroB, 'pt-BR');
      if (bairroCompare !== 0) return bairroCompare;

      return (a.cliente?.nome || a.numero).localeCompare(b.cliente?.nome || b.numero, 'pt-BR');
    });
  }, [filtroSelecao, mostrarApenasFalhas, mostrarSomenteSelecionadas, notas, selecionadasSet]);

  const notasAgrupadas = useMemo(() => {
    const grupos: Record<string, NotaExterna[]> = {};

    notasFiltradas.forEach(nota => {
      const bairro = nota.cliente?.bairro || 'Não Informado';
      if (!grupos[bairro]) grupos[bairro] = [];
      grupos[bairro].push(nota);
    });
    return grupos;
  }, [notasFiltradas]);

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

  const idsFiltrados = useMemo(
    () => notasFiltradas.map((nota) => nota.numero),
    [notasFiltradas]
  );

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

  const handleSelecionarNotas = (ids: string[], selecionar: boolean) => {
    const unicos = Array.from(new Set(ids.filter(Boolean)));
    const targetSet = new Set(unicos);

    setSelecionadas((prev) => {
      const next = new Set(prev);
      if (selecionar) {
        unicos.forEach((id) => next.add(id));
      } else {
        unicos.forEach((id) => next.delete(id));
      }
      return Array.from(next);
    });

    setManualOrder((prev) => {
      if (selecionar) {
        return [...prev, ...unicos.filter((id) => !prev.includes(id))];
      }
      return prev.filter((id) => !targetSet.has(id));
    });
  };

  const handleSelecionarFiltradas = () => {
    if (idsFiltrados.length === 0) {
      enqueueSnackbar('Nenhuma entrega filtrada para selecionar.', { variant: 'info' });
      return;
    }
    handleSelecionarNotas(idsFiltrados, true);
  };

  const handleLimparFiltradas = () => {
    if (idsFiltrados.length === 0) {
      enqueueSnackbar('Nenhuma entrega filtrada para limpar.', { variant: 'info' });
      return;
    }
    handleSelecionarNotas(idsFiltrados, false);
  };

  const handleSelecionarTodas = () => handleSelecionarNotas(notas.map((nota) => nota.numero), true);

  const handleLimparSelecao = () => {
    setSelecionadas([]);
    setManualOrder([]);
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
      setRouteMetrics(null);
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
    setRouteMetrics(null);
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
          const ultimoPonto = waypointsFinais[waypointsFinais.length - 1];
          let routeBackResult: Awaited<ReturnType<typeof RoutingService.calculateRoute>> | null = null;

          if (ultimoPonto) {
            routeBackResult = await RoutingService.calculateRoute([ultimoPonto, baseCoords]);
          }

          const geometrias = [{
            geometry: routeResult.geometry.map((c: [number, number]) => [c[1], c[0]]),
            regiao: 0,
            distance: routeResult.distance,
            duration: routeResult.duration,
            label: 'Ida'
          }];

          if (routeBackResult) {
            geometrias.push({
              geometry: routeBackResult.geometry.map((c: [number, number]) => [c[1], c[0]]),
              regiao: 1,
              distance: routeBackResult.distance,
              duration: routeBackResult.duration,
              label: 'Volta'
            });
          }

          setRouteGeometry(geometrias);
          setRouteMetrics({
            distanciaIda: routeResult.distance,
            distanciaVolta: routeBackResult?.distance || 0,
            distanciaTotal: routeResult.distance + (routeBackResult?.distance || 0),
            duracaoIda: routeResult.duration,
            duracaoVolta: routeBackResult?.duration || 0,
            duracaoTotal: routeResult.duration + (routeBackResult?.duration || 0),
          });
        } catch (routeError: any) {
          console.error('Erro ao calcular rota:', routeError);
          if (routeError.message.includes('25 waypoints')) {
            enqueueSnackbar('Rota muito grande. Selecione no máximo 25 pontos para otimização.', { variant: 'warning' });
          } else {
            enqueueSnackbar('Erro ao calcular rota otimizada. Usando linhas retas.', { variant: 'error' });
          }
          setRouteGeometry([]);
          setRouteMetrics(null);
        }
      } else {
        setRouteGeometry([]);
        setRouteMetrics(null);
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

  const handleImprimir = async () => {
    const entregas = markers
      .filter((marker): marker is MapMarker & { type: 'delivery' } => marker.type === 'delivery')
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

    if (entregas.length === 0) {
      enqueueSnackbar('Gere uma rota no mapa primeiro para exportar o PDF.', { variant: 'info' });
      return;
    }

    if (!routeMetrics) {
      enqueueSnackbar('A rota precisa ter os quilômetros calculados antes de gerar o PDF.', { variant: 'warning' });
      return;
    }

    setGerandoPdf(true);

    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const existingBytes = await fetch('/templates/modelo-romaneio.pdf').then((res) => res.arrayBuffer());
      const doc = await PDFDocument.load(existingBytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      let page = doc.getPage(0);
      let { width, height } = page.getSize();
      const fontSize = 9;
      const smallFontSize = 8;
      const lineHeight = 12;
      const topMargin = 40;
      const bottomMargin = 52;
      const leftMargin = 35;
      const rightMargin = 35;
      let yPos = height - topMargin;

      const drawText = (
        text: string,
        x: number,
        y: number,
        options?: { bold?: boolean; size?: number; color?: [number, number, number] }
      ) => {
        page.drawText(text, {
          x,
          y,
          size: options?.size ?? fontSize,
          font: options?.bold ? fontBold : font,
          color: options?.color ? rgb(options.color[0], options.color[1], options.color[2]) : rgb(0, 0, 0),
        });
      };

      const truncateToWidth = (text: string, maxWidth: number, size = fontSize, bold = false) => {
        const selectedFont = bold ? fontBold : font;
        const normalized = (text || '').replace(/\s+/g, ' ').trim();
        if (!normalized) return '-';
        if (selectedFont.widthOfTextAtSize(normalized, size) <= maxWidth) return normalized;

        let truncated = normalized;
        while (truncated.length > 1 && selectedFont.widthOfTextAtSize(`${truncated}...`, size) > maxWidth) {
          truncated = truncated.slice(0, -1);
        }
        return `${truncated.trim()}...`;
      };

      const addNewPage = () => {
        page = doc.addPage([width, height]);
        ({ width, height } = page.getSize());
        yPos = height - topMargin;
      };

      const drawTableHeader = (headerY: number) => {
        const colSeq = leftMargin;
        const colNota = colSeq + 28;
        const colPedido = colNota + 58;
        const colCliente = colPedido + 56;
        const colRegiao = colCliente + 156;
        const colValor = colRegiao + 118;
        const colPeso = colValor + 64;

        page.drawRectangle({
          x: leftMargin - 4,
          y: headerY - 6,
          width: width - leftMargin - rightMargin + 8,
          height: 18,
          color: rgb(0.95, 0.96, 0.98),
        });

        drawText('Seq', colSeq, headerY, { bold: true, size: smallFontSize });
        drawText('Nota', colNota, headerY, { bold: true, size: smallFontSize });
        drawText('Pedido', colPedido, headerY, { bold: true, size: smallFontSize });
        drawText('Cliente', colCliente, headerY, { bold: true, size: smallFontSize });
        drawText('Região', colRegiao, headerY, { bold: true, size: smallFontSize });
        drawText('Valor', colValor, headerY, { bold: true, size: smallFontSize });
        drawText('Peso', colPeso, headerY, { bold: true, size: smallFontSize });

        page.drawLine({
          start: { x: leftMargin, y: headerY - 8 },
          end: { x: width - rightMargin, y: headerY - 8 },
          thickness: 0.8,
          color: rgb(0.78, 0.82, 0.88),
        });

        return { colSeq, colNota, colPedido, colCliente, colRegiao, colValor, colPeso };
      };

      const dataGeracao = format(new Date(), 'dd/MM/yyyy');
      const horaGeracao = format(new Date(), 'HH:mm');
      const tituloModo = modoRota === 'proximidade' ? 'Proximidade' : 'Manual';
      const valorTotal = entregas.reduce((sum, marker) => sum + parseNumber(marker.valorPedido), 0);
      const pesoTotal = entregas.reduce((sum, marker) => sum + parseNumber(marker.pesoPedido), 0);
      const baseDescricao = 'Área Especial para Indústria 11, Lote 11 a 14, Galpão 03 - Sobradinho, Brasília - DF';

      yPos -= lineHeight * 9;
      drawText('Transportadora: Roteirização Control Carga', 50, yPos);
      drawText(`Usuário: Operação`, 280, yPos);

      yPos -= lineHeight * 1.5;
      drawText(`Base: ${truncateToWidth(baseDescricao, 190)}`, 50, yPos);
      drawText(`Modo de rota: ${tituloModo}`, 280, yPos);

      yPos -= lineHeight * 1.5;
      drawText(`Entregas: ${entregas.length}`, 50, yPos);
      drawText(`Horário: ${horaGeracao}`, 280, yPos);

      yPos -= lineHeight * 1.5;
      drawText(`Km ida: ${formatDistance(routeMetrics.distanciaIda)}`, 50, yPos);
      drawText(`Km volta: ${formatDistance(routeMetrics.distanciaVolta)}`, 180, yPos);
      drawText(`Km total: ${formatDistance(routeMetrics.distanciaTotal)}`, 340, yPos);

      yPos -= lineHeight * 1.5;
      drawText(`Tempo total: ${formatDuration(routeMetrics.duracaoTotal)}`, 50, yPos);
      drawText(`Data: ${dataGeracao}`, 280, yPos);

      yPos -= lineHeight * 1.5;
      drawText(`Valor total: ${formatCurrency(valorTotal)}`, 50, yPos);
      drawText(`Peso total: ${formatPeso(pesoTotal)}`, 280, yPos);

      yPos -= lineHeight * 2;
      let tableColumns = drawTableHeader(yPos);
      yPos -= 22;

      for (const marker of entregas) {
        if (yPos <= bottomMargin + 36) {
          addNewPage();
          yPos -= lineHeight * 2;
          tableColumns = drawTableHeader(yPos);
          yPos -= 22;
        }

        const nota = notas.find((item) => item.numero === marker.id);
        const pedido = marker.orcamentoId ? String(marker.orcamentoId) : '---';
        const cliente = truncateToWidth(
          nota?.cliente?.nome || marker.clienteNome || marker.label || '-',
          150,
          fontSize,
          true
        );
        const regiao = truncateToWidth(
          [nota?.cliente?.bairro || marker.bairro, nota?.cliente?.cidade || marker.cidade]
            .filter(Boolean)
            .join(' - ') || 'Sem região',
          112,
          smallFontSize
        );
        const cep = truncateToWidth(nota?.cliente?.cep || '-', 112, smallFontSize);

        drawText(String(marker.sequence || '-'), tableColumns.colSeq, yPos, { bold: true });
        drawText(String(marker.id || '-'), tableColumns.colNota, yPos);
        drawText(pedido, tableColumns.colPedido, yPos);
        drawText(cliente, tableColumns.colCliente, yPos, { bold: true });
        drawText(regiao, tableColumns.colRegiao, yPos);
        drawText(formatCurrency(marker.valorPedido), tableColumns.colValor, yPos);
        drawText(formatPeso(marker.pesoPedido), tableColumns.colPeso, yPos);

        drawText(`CEP: ${cep}`, tableColumns.colCliente, yPos - 10, {
          size: smallFontSize,
          color: [0.35, 0.35, 0.35],
        });

        page.drawLine({
          start: { x: leftMargin, y: yPos - 15 },
          end: { x: width - rightMargin, y: yPos - 15 },
          thickness: 0.5,
          color: rgb(0.88, 0.9, 0.93),
        });

        yPos -= 24;
      }

      const footerY = Math.max(bottomMargin - 4, yPos - 10);
      drawText('Documento gerado automaticamente pela roteirização.', leftMargin, footerY, {
        size: smallFontSize,
        color: [0.38, 0.38, 0.38],
      });

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const openedWindow = window.open(url, '_blank', 'noopener,noreferrer');

      if (!openedWindow) {
        enqueueSnackbar('O navegador bloqueou a abertura do PDF. Libere o pop-up para visualizar.', { variant: 'warning' });
        return;
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      enqueueSnackbar('PDF da rota aberto para visualização.', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao gerar PDF da rota:', error);
      enqueueSnackbar('Erro ao gerar PDF da rota.', { variant: 'error' });
    } finally {
      setGerandoPdf(false);
    }
  };

  const limparTudo = () => {

    setNotas([]);
    setSelecionadas([]);
    setManualOrder([]);
    setMarkers([]);
    setRouteWaypoints([]);
    setRouteGeometry([]);
    setRouteMetrics(null);
    setPerfil6mAlertas({});
    setBusca('');
    setFiltroSelecao('');
    setMostrarSomenteSelecionadas(false);
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
            startIcon={gerandoPdf ? <CircularProgress size={16} color="inherit" /> : <RouteIcon fontSize="small" />}
            onClick={handleImprimir}
            disabled={markers.length <= 1 || !routeMetrics || gerandoPdf}
            sx={{ borderRadius: '9px', px: 1.25, fontSize: '0.75rem' }}
          >
            {gerandoPdf ? 'Gerando...' : 'PDF'}
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

              <Box display="flex" gap={1} mb={1.5} flexWrap="wrap">
                <TextField
                  fullWidth
                  size="small"
                  label="Filtrar seleção"
                  placeholder="Nota, cliente, bairro, cidade ou pedido"
                  value={filtroSelecao}
                  onChange={(e) => setFiltroSelecao(e.target.value)}
                />
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
                  <Chip
                    size="small"
                    label="Só selecionadas"
                    color="primary"
                    clickable
                    onClick={() => setMostrarSomenteSelecionadas(!mostrarSomenteSelecionadas)}
                    variant={mostrarSomenteSelecionadas ? 'filled' : 'outlined'}
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
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Visíveis: ${notasFiltradas.length}`}
                />
              </Box>

              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Button size="small" variant="outlined" onClick={handleSelecionarFiltradas}>
                  Selecionar filtradas
                </Button>
                <Button size="small" variant="outlined" color="warning" onClick={handleLimparFiltradas}>
                  Limpar filtradas
                </Button>
                <Button size="small" variant="outlined" onClick={handleSelecionarTodas} disabled={notas.length === 0}>
                  Selecionar tudo
                </Button>
                <Button size="small" variant="outlined" color="error" onClick={handleLimparSelecao} disabled={selecionadas.length === 0}>
                  Limpar seleção
                </Button>
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
                      <Box display="flex" alignItems="center" gap={1}>
                        <Checkbox
                          size="small"
                          checked={notasDoBairro.every((nota) => selecionadasSet.has(nota.numero))}
                          indeterminate={
                            notasDoBairro.some((nota) => selecionadasSet.has(nota.numero)) &&
                            !notasDoBairro.every((nota) => selecionadasSet.has(nota.numero))
                          }
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleSelecionarNotas(
                            notasDoBairro.map((nota) => nota.numero),
                            e.target.checked
                          )}
                        />
                        <span>
                          {bairro} ({notasDoBairro.length})
                          {notasDoBairro.some((nota) => selecionadasSet.has(nota.numero))
                            ? ` • ${notasDoBairro.filter((nota) => selecionadasSet.has(nota.numero)).length} sel.`
                            : ''}
                        </span>
                      </Box>
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
                    {routeMetrics && (
                      <>
                        <Chip
                          label={`Ida ${formatDistance(routeMetrics.distanciaIda)}`}
                          size="small"
                          sx={{ bgcolor: 'rgba(14,116,144,0.35)', color: 'white', fontWeight: 'bold' }}
                        />
                        <Chip
                          label={`Volta ${formatDistance(routeMetrics.distanciaVolta)}`}
                          size="small"
                          sx={{ bgcolor: 'rgba(234,88,12,0.35)', color: 'white', fontWeight: 'bold' }}
                        />
                        <Chip
                          label={`Total ${formatDistance(routeMetrics.distanciaTotal)}`}
                          size="small"
                          sx={{ bgcolor: 'rgba(15,23,42,0.35)', color: 'white', fontWeight: 'bold' }}
                        />
                      </>
                    )}
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

            {routeMetrics && (
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  gap: 1,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  bgcolor: 'grey.50'
                }}
              >
                <Chip label={`Ida: ${formatDistance(routeMetrics.distanciaIda)}`} color="info" variant="outlined" />
                <Chip label={`Volta: ${formatDistance(routeMetrics.distanciaVolta)}`} color="warning" variant="outlined" />
                <Chip label={`Total: ${formatDistance(routeMetrics.distanciaTotal)}`} color="success" variant="filled" />
                <Chip label={`Tempo total: ${formatDuration(routeMetrics.duracaoTotal)}`} variant="outlined" />
              </Box>
            )}

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
