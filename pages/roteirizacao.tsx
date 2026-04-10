import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
  ToggleButton
} from '@mui/material';


import {
  Search as SearchIcon,
  LocationOn as LocationOnIcon,
  Route as RouteIcon,
  LocalShipping as ShippingIcon,
  FilterList as FilterIcon,
  Info as InfoIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  OpenInNew as OpenInNewIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  BugReport as BugIcon,
  Warning as WarningIcon,
  Map as MapIcon
} from '@mui/icons-material';



import { useSnackbar } from 'notistack';
import Map, { MapMarker } from '../components/Map';
import { GeocodingService } from '../services/geocoding';
import axios from 'axios';
import { AppLayout } from '@/components/layout/AppLayout';
import { CEPService } from '../services/cep';




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
  statusGeocoding?: 'loading' | 'success' | 'error' | null;
  erroMensagem?: string;
  _debugRaw?: { b: string, c: string, e: string };
}








const RoteirizacaoPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [notas, setNotas] = useState<NotaExterna[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [routeWaypoints, setRouteWaypoints] = useState<[number, number][]>([]);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [mostrarApenasFalhas, setMostrarApenasFalhas] = useState(false);
  const [daysToLoad, setDaysToLoad] = useState<number>(7);
  const [selectedBairro, setSelectedBairro] = useState<string | null>(null);
  // Centro de Distribuição Esplendor (Sobradinho - DF) - CEP 73.050-624
  const [baseCoords, setBaseCoords] = useState<[number, number]>([-15.6507, -47.77347]);


  const notasAgrupadas = React.useMemo(() => {
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

  const mapCenterZoom = React.useMemo(() => {
    if (!selectedBairro || !notasAgrupadas[selectedBairro]) {
      return markers.length > 0 ? { center: [markers[0].lat, markers[0].lng], zoom: 12 } : { center: baseCoords, zoom: 11 };
    }

    const bairroNotas = notasAgrupadas[selectedBairro];
    const bairroMarkers = markers.filter(m => bairroNotas.some(n => n.numero === m.id));

    if (bairroMarkers.length === 0) {
      return { center: baseCoords, zoom: 11 };
    }

    // Calcular centro médio
    const avgLat = bairroMarkers.reduce((sum, m) => sum + m.lat, 0) / bairroMarkers.length;
    const avgLng = bairroMarkers.reduce((sum, m) => sum + m.lng, 0) / bairroMarkers.length;

    // Calcular zoom baseado na dispersão (simples)
    const maxDist = Math.max(
      ...bairroMarkers.map(m => Math.sqrt((m.lat - avgLat) ** 2 + (m.lng - avgLng) ** 2))
    );
    const zoom = maxDist > 0.01 ? 14 : 16; // Ajustar conforme necessário

    return { center: [avgLat, avgLng], zoom };
  }, [selectedBairro, notasAgrupadas, markers, baseCoords]);




  
  const handleBuscar = async () => {
    if (!busca) return;
    setLoading(true);
    try {
      // Usando a API existente de buscar-nota-externa
      const response = await axios.get(`/api/buscar-nota-externa?numero=${busca}`);
      if (response.data) {
        // Se retornar uma única nota, transformamos em array
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
        peso: p.PESO || p.PESO_NOTA
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


  const handleToggleNota = (numero: string) => {
    setSelecionadas(prev => 
      prev.includes(numero) ? prev.filter(n => n !== numero) : [...prev, numero]
    );
  };

  const handleGerarRota = async () => {
    if (selecionadas.length === 0) {
      enqueueSnackbar('Selecione pelo menos uma nota.', { variant: 'warning' });
      return;
    }

    setGeocoding(true);
    const novasMarkers: MapMarker[] = [];
    const waypoints: [number, number][] = [];

    const selecionadasOrdenadas = [...selecionadas].sort((a, b) => {
      const notaA = notas.find(n => n.numero === a);
      const notaB = notas.find(n => n.numero === b);
      return (notaA?.cliente?.cep || '').localeCompare(notaB?.cliente?.cep || '');
    });

    waypoints.push(baseCoords);

    novasMarkers.push({
      lat: baseCoords[0],
      lng: baseCoords[1],
      label: 'CD: Esplendor Atacadista',
      details: 'Ponto de Partida (Águas Lindas)',
      id: 'base',
      type: 'start'
    });

    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < selecionadasOrdenadas.length; i++) {
        const numero = selecionadasOrdenadas[i];
        const nota = notas.find(n => n.numero === numero);


        if (nota && nota.cliente) {
          setNotas(prev => prev.map(n => n.numero === nota.numero ? { ...n, statusGeocoding: 'loading' } : n));

          if (i % 5 === 0) {
            enqueueSnackbar(`Localizando endereços... ${i + 1}/${selecionadasOrdenadas.length}`, { variant: 'info', autoHideDuration: 2000 });
          }

          let bairro = nota.cliente.bairro;
          let cidade = nota.cliente.cidade;

          // Automatic CEP Enrichment if data is missing
          if (nota.cliente.cep && (!bairro || !cidade)) {

            console.log(`[Roteirizacao] CEP Enrichment for note ${nota.numero}`);
            const cepData = await CEPService.buscarCEP(nota.cliente.cep);
            if (cepData) {
              bairro = bairro || cepData.bairro || '';
              cidade = cidade || cepData.localidade || '';
              if (!nota.cliente.estado) nota.cliente.estado = cepData.uf || '';

              // Atualizar para o usuário ver e corrigir endereço
              setNotas(prev => prev.map(n => n.numero === nota.numero ? {
                ...n,
                cliente: {
                  ...n.cliente,
                  endereco: n.cliente?.endereco || cepData.logradouro || '',
                  bairro: bairro,
                  cidade: cidade,
                  estado: n.cliente?.estado || cepData.uf || ''
                }
              } : n));
            }
          }

          // Rescue logic: se cidade/bairro em branco, assumir Brasília/DF se for o contexto
          if (!cidade && (nota.cliente.estado === 'DF' || !nota.cliente.estado)) {
            cidade = 'Brasília';
            if (!nota.cliente.estado) nota.cliente.estado = 'DF';
          }


          const logradouroComNumero = `${nota.cliente.endereco}${nota.numeroEndereco ? ' ' + nota.numeroEndereco : ''}`;
          const enderecoStr = [
            nota.cliente.endereco,
            nota.numeroEndereco,
            bairro,
            cidade,
            nota.cliente.estado,
            nota.cliente.cep
          ].filter(Boolean).map(s => String(s).trim()).filter(s => s !== '' && s !== 'undefined').join(', ');



          
          console.log(`[Roteirizacao] Geocodificando (${i + 1}/${selecionadasOrdenadas.length}): ${enderecoStr}`);

          const coords = await GeocodingService.geocode(enderecoStr);
          
          if (coords) {
            setNotas(prev => prev.map(n => n.numero === nota.numero ? { ...n, statusGeocoding: 'success' } : n));
            novasMarkers.push({
              lat: coords.lat,
              lng: coords.lng,
              label: `NFe ${nota.numero}`,
              details: `Cliente: ${nota.cliente.nome}\nEndereço: ${logradouroComNumero}\nBairro: ${nota.cliente.bairro}\nCidade: ${nota.cliente.cidade}\nEstado: ${nota.cliente.estado}\nCEP: ${nota.cliente.cep}`,
              id: nota.numero,
              type: 'delivery'
            });
            waypoints.push([coords.lat, coords.lng]);
            successCount++;
          } else {
            setNotas(prev => prev.map(n => n.numero === nota.numero ? { ...n, statusGeocoding: 'error', erroMensagem: 'Endereço não encontrado (tentado: Completo, Sem Número e CEP)' } : n));
            console.warn(`[Roteirizacao] Não foi possível encontrar coordenadas para: ${enderecoStr}`);
            errorCount++;
          }



          if (i < selecionadasOrdenadas.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1100));
          }
        }
      }

      setMarkers(novasMarkers);
      setRouteWaypoints(waypoints);

      if (waypoints.length > 1) {
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


  const handleSelecionarProximas = () => {
    if (notas.length === 0) return;
    
    // Calcular distância de todas as notas para a base
    const comDistancia = notas.map(n => {
      // Se não tiver markers (não foi geocodificada), não podemos calcular proximidade real
      // mas podemos tentar pelo CEP ou apenas deixar pro final
      const marker = markers.find(m => m.id === n.numero);
      if (marker) {
        const dist = Math.sqrt(Math.pow(marker.lat - baseCoords[0], 2) + Math.pow(marker.lng - baseCoords[1], 2));
        return { numero: n.numero, dist };
      }
      return { numero: n.numero, dist: Infinity };
    });

    // Ordenar por distância
    comDistancia.sort((a, b) => a.dist - b.dist);
    
    // Pegar as 15 primeiras (que não sejam a base)
    const proximas = comDistancia.slice(0, 15).map(x => x.numero);
    setSelecionadas(proximas);
    enqueueSnackbar('Selecionadas as 15 entregas mais próximas localizadas.', { variant: 'success' });
  };

  const handleOtimizarRota = () => {
    if (markers.length <= 2) {
      if (markers.length === 2) {
        setRouteWaypoints(markers.map(m => [m.lat, m.lng]));
      }
      return;
    }

    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const unvisited = [...markers.filter(m => m.type !== 'start')];
    let currentPos: [number, number] = baseCoords;
    const optimizedWaypoints: [number, number][] = [baseCoords];
    let totalDistance = 0;

    while (unvisited.length > 0) {
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const d = haversineDistance(
          currentPos[0], currentPos[1],
          unvisited[i].lat, unvisited[i].lng
        );
        if (d < minDistance) {
          minDistance = d;
          nearestIdx = i;
        }
      }

      const nearest = unvisited.splice(nearestIdx, 1)[0];
      optimizedWaypoints.push([nearest.lat, nearest.lng]);
      totalDistance += minDistance;
      currentPos = [nearest.lat, nearest.lng];
    }

    setRouteWaypoints(optimizedWaypoints);
    enqueueSnackbar(`Rota otimizada! Distância total: ~${Math.round(totalDistance)} km`, { variant: 'success' });
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
      } catch (err) {
        // Usuário cancelou ou não suportado, tentar copiar
      }
    }

    // Fallback: copiar para a área de transferência
    try {
      await navigator.clipboard.writeText(shareText);
      enqueueSnackbar('Link de localização copiado!', { variant: 'success' });
    } catch (err) {
      // Fallback final: abrir no Google Maps
      window.open(googleMapsUrl, '_blank');
    }
  };

  const handleOpenGoogleMaps = (nota: NotaExterna) => {
    const marker = markers.find(m => m.id === nota.numero);
    if (!marker) {
      enqueueSnackbar('Localização não disponível. Gere a rota primeiro.', { variant: 'warning' });
      return;
    }
    const url = `https://www.google.com/maps?q=${marker.lat},${marker.lng}`;
    window.open(url, '_blank');
  };

  return (
    <AppLayout title="Roteirização Inteligente" subtitle="Otimização de rotas para entregas">
      <Container maxWidth="xl" sx={{ py: 2 }}>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>

        <Box display="flex" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary">Carregar:</Typography>
            <ToggleButtonGroup
              value={daysToLoad}
              exclusive
              onChange={(e, val) => val && setDaysToLoad(val)}
              size="small"
            >
              <ToggleButton value={1}>Hoje</ToggleButton>
              <ToggleButton value={3}>3 dias</ToggleButton>
              <ToggleButton value={7}>7 dias</ToggleButton>
              <ToggleButton value={14}>14 dias</ToggleButton>
              <ToggleButton value={30}>30 dias</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={loadingEntregas ? <CircularProgress size={20} color="inherit" /> : <ShippingIcon />}
            onClick={() => handleCarregarEntregas(daysToLoad)}
            disabled={loadingEntregas}
            sx={{
              borderRadius: '12px',
              px: 4,
              py: 1.5,
              fontWeight: 'bold',
              boxShadow: '0 4px 14px 0 rgba(37, 99, 235, 0.39)',
              '&:hover': {
                boxShadow: '0 6px 20px rgba(37, 99, 235, 0.23)',
              }
            }}
          >
            {loadingEntregas ? 'Carregando...' : `Carregar Entregas (${daysToLoad} dia${daysToLoad > 1 ? 's' : ''})`}
          </Button>
          {/* <Button
            variant="outlined"
            color="primary"
            startIcon={<LocationOnIcon />}
            onClick={handleSelecionarProximas}
            disabled={markers.length === 0}
            sx={{ borderRadius: '12px' }}
          >
            Selecionar 15 Próximas
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<SearchIcon />}
            onClick={() => {
              console.log('DEBUG Pedidos:', notas);
              enqueueSnackbar('Dados dos pedidos logados no console (F12)', { variant: 'info' });
            }}
            sx={{ borderRadius: '12px' }}
          >
            Debug Dados
          </Button> */}
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={limparTudo}
            sx={{ borderRadius: '12px' }}
          >
            Limpar Tudo
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<RouteIcon />} 
            onClick={handleImprimir}
            disabled={markers.length <= 1}
            sx={{ borderRadius: '12px' }}
          >
            Imprimir Rota (PDF)
          </Button>
        </Box>
      </Box>



      <Grid container spacing={3}>
        {/* Lado Esquerdo: Busca e Lista */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', borderRadius: '16px', boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="600">
                Selecionar Entregas
              </Typography>
              
              <Box display="flex" gap={1} mb={3}>
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
                  onClick={handleBuscar}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Add'}
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" color="text.secondary">
                  {selecionadas.length} de {notas.length} selecionadas
                </Typography>
                <Box>
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
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                      onClick={() => setSelectedBairro(selectedBairro === bairro ? null : bairro)}
                    >
                      {bairro} ({notasDoBairro.length})
                    </ListSubheader>
                    {notasDoBairro.map((nota) => (
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
                            <MuiTooltip title="Abrir no Google Maps">
                              <IconButton size="small" onClick={() => handleOpenGoogleMaps(nota)} sx={{ p: 0.3 }}>
                                <OpenInNewIcon sx={{ fontSize: '14px', color: 'primary.main' }} />
                              </IconButton>
                            </MuiTooltip>
                            <MuiTooltip title="Compartilhar localização">
                              <IconButton size="small" onClick={() => handleShareLocation(nota)} sx={{ p: 0.3 }}>
                                <ShareIcon sx={{ fontSize: '14px', color: 'secondary.main' }} />
                              </IconButton>
                            </MuiTooltip>
                          </Box>
                        )}
                        {nota.statusGeocoding === 'error' && <Chip size="small" label="Erro" color="error" variant="outlined" sx={{ ml: 1, fontSize: '9px', height: '18px' }} />}
                      </ListItem>
                    ))}
                  </React.Fragment>
                ))}
                
                {notas.length === 0 && (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                    Busque e adicione notas para começar
                  </Typography>
                )}
              </List>


              <Box mt={3}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  startIcon={geocoding ? <CircularProgress size={20} color="inherit" /> : <MapIcon />}
                  onClick={handleGerarRota}
                  disabled={selecionadas.length === 0 || geocoding}
                  sx={{ borderRadius: '12px', py: 1.5 }}
                >
                  {geocoding ? 'Localizando...' : 'Visualizar no Mapa'}
                </Button>
                {/* <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  size="medium"
                  startIcon={<RouteIcon />}
                  onClick={handleOtimizarRota}
                  disabled={markers.length <= 1 || geocoding}
                  sx={{ borderRadius: '12px', mt: 1 }}
                >
                  Roteirizar por Proximidade
                </Button> */}
                <Box display="flex" gap={1} mt={1}>
                      <Button
                        variant="outlined"
                        startIcon={<ShippingIcon />}
                        onClick={() => handleCarregarEntregas(7)}
                        disabled={loadingEntregas}
                        sx={{ borderRadius: '8px' }}
                      >
                        Carregar Entregas
                      </Button>

                </Box>

              </Box>

            </CardContent>
          </Card>
        </Grid>

        {/* Lado Direito: Mapa */}
        <Grid item xs={12} md={8}>
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
                  <Chip
                    label={`${routeWaypoints.length - 1} entregas`}
                    size="small"
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 'bold' }}
                  />
                )}
              </Box>
            </Box>
            <Box sx={{ height: '600px', position: 'relative' }}>
              <Map
                markers={markers}
                routeWaypoints={routeWaypoints}
                height="600px"
                center={mapCenterZoom.center}
                zoom={mapCenterZoom.zoom}
                onRoutingError={handleRoutingError}
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
