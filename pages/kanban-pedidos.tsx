import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Grid,
  CircularProgress,
  IconButton,
  Alert,
  Tooltip,
  Paper,
  Divider,
  Button,
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface Pedido {
  ORCAMENTO_ID?: number;
  PEDIDO_ID?: number;
  ID?: number;
  CADASTRO_ID?: number;
  VENDEDOR_ID?: number;
  VALOR_PEDIDO?: number;
  VALOR_PRODUTOS?: number;
  VALOR_DUPLICATA?: number;
  VALOR_TOTAL?: number;
  VALOR_FRETE_PROCESSADO?: number;
  VALOR_DESCONTO?: number;
  CLIENTE_NOME?: string;
  NOME_RAZAO_SOCIAL?: string;
  NOME_FANTASIA?: string;
  VENDEDOR_NOME?: string;
  NOME?: string;
  DATA_HORA_CADASTRO?: string;
  DATA_HORA_ALTERACAO?: string;
  DATA_HORA_FECHAMENTO?: string;
  DATA_ENTREGA?: string;
  DATA_HORA_RECEBIMENTO?: string;
  DATA_HORA_LIBERACAO_BLOQ?: string;
  DATA_VALIDADE_ORCAMENTO?: string;
  PEDIDO_FECHADO?: "S" | "N";
  BLOQUEADO?: "S" | "N";
  SISTEMA_ORIGEM_PEDIDO?: string;
  CODIGO_PEDIDO_WEB?: string;
  LOGRADOURO_ENTREGA?: string;
  COMPLEMENTO_ENTREGA?: string;
  CEP_ENTREGA?: string;
  TIPO_ENTREGA?: string;
  PRAZO_MEDIO_VENDA?: number;
}

interface OrderDetail {
  pedidoId: number;
  clienteId: number;
  clienteNome: string;
  valor: number;
  valorFrete?: number;
  valorDesconto?: number;
  dataHora: string;
  dataEntrega: string | null;
  sistemaOrigem?: string;
  codigoPedidoWeb?: string;
  enderecoEntrega?: string;
  tipoEntrega?: string;
  bloqueado?: boolean;
}

interface RepresentanteAgrupado {
  id: string;
  representanteNome: string;
  vendedorId: number;
  title: string;
  priority: "High" | "Medium" | "Low";
  status: "Abertos" | "Bloqueados" | "Fechados";
  count: number;
  date: string;
  orders: OrderDetail[];
}

type PedidoStatus = 'Abertos' | 'Bloqueados' | 'Fechados';

function formatMoney(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getColumnColor(status: string) {
  switch (status) {
    case 'Abertos': return '#f59e0b';
    case 'Bloqueados': return '#ef4444';
    case 'Fechados': return '#10b981';
    default: return '#ccc';
  }
}

function RepresentanteCard({ representante }: { representante: RepresentanteAgrupado }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const displayOrders = isExpanded ? representante.orders : representante.orders.slice(0, 3);
  const remainingCount = representante.count - 3;
  const totalValue = representante.orders.reduce((sum, order) => sum + order.valor, 0);

  return (
    <Card sx={{ mb: 2, borderLeft: `4px solid ${getColumnColor(representante.status)}`, boxShadow: 2 }}>
      <CardHeader
        sx={{ pb: 1, backgroundColor: 'background.default' }}
        title={
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2Icon fontSize="small" /> {representante.title}
          </Typography>
        }
        subheader={
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" display="block">
              {representante.count} {representante.count === 1 ? 'pedido' : 'pedidos'}
            </Typography>
            <Typography variant="body2" color="success.main" fontWeight="bold">
              Total: {formatMoney(totalValue)}
            </Typography>
          </Box>
        }
      />
      <Divider />
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {displayOrders.map((order, idx) => (
            <Paper key={idx} variant="outlined" sx={{ p: 1, backgroundColor: 'grey.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Inventory2Icon sx={{ fontSize: 12 }} /> Pedido #{order.pedidoId}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                👤 #{order.clienteId} - {order.clienteNome}
              </Typography>
              {order.enderecoEntrega && (
               <Typography variant="caption" color="text.disabled" display="block" noWrap sx={{ mt: 0.5 }}>
                 📍 {order.enderecoEntrega}
               </Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px solid #e0e0e0' }}>
                 <Typography variant="caption" color="text.secondary">Total do Pedido</Typography>
                 <Typography variant="caption" color="success.main" fontWeight="bold">{formatMoney(order.valor)}</Typography>
              </Box>
            </Paper>
          ))}
          {!isExpanded && remainingCount > 0 && (
            <Button size="small" onClick={() => setIsExpanded(true)} endIcon={<KeyboardArrowDownIcon />}>
              Ver todos (+{remainingCount})
            </Button>
          )}
          {isExpanded && representante.count > 3 && (
            <Button size="small" color="inherit" onClick={() => setIsExpanded(false)} endIcon={<KeyboardArrowUpIcon />}>
              Recolher
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ columnId, representantes }: { columnId: PedidoStatus, representantes: RepresentanteAgrupado[] }) {
  const totalValue = representantes.reduce((sum, rep) => sum + rep.orders.reduce((oSum, o) => oSum + o.valor, 0), 0);
  const columnTitle = columnId === 'Abertos' ? 'Rodando' : columnId === 'Bloqueados' ? 'Bloqueados' : 'Fechados';
  
  const ColumnIcon = columnId === 'Abertos' ? AccessTimeIcon : columnId === 'Bloqueados' ? CloseIcon : CheckCircleIcon;

  return (
    <Box sx={{ width: '100%', minWidth: { xs: '100%', sm: 300 }, maxWidth: 400, display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, borderRadius: '8px 8px 0 0', borderTop: `4px solid ${getColumnColor(columnId)}`, backgroundColor: 'grey.100' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
             <ColumnIcon fontSize="small" sx={{ color: getColumnColor(columnId) }} /> {columnTitle}
          </Typography>
          <Chip label={representantes.length} size="small" />
        </Box>
        <Typography variant="caption" color="text.secondary">Total:</Typography>{' '}
        <Typography variant="caption" color="success.main" fontWeight="bold">{formatMoney(totalValue)}</Typography>
      </Paper>
      
      <Box sx={{ flex: 1, p: 2, backgroundColor: 'grey.200', borderRadius: '0 0 8px 8px', minHeight: 600 }}>
        {representantes.map(rep => (
          <RepresentanteCard key={rep.id} representante={rep} />
        ))}
        {representantes.length === 0 && (
          <Box sx={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #ccc', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Nenhum representante</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default function PedidosKanban() {
  const [columns, setColumns] = useState<Record<PedidoStatus, RepresentanteAgrupado[]>>({
    Abertos: [], Bloqueados: [], Fechados: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPedidos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Usando API de pedidos externos existente no sistema que proxyia para a Santri
      const today = new Date().toISOString().split('T')[0];
      // Buscando de hoje
      const url = `/api/pedidos/externos?data_inicio=${today}&data_fim=${today}&limit=500`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Falha ao buscar pedidos');
      
      const apiResponse = await response.json();
      const pedidos: Pedido[] = Array.isArray(apiResponse.data) ? apiResponse.data : [];

      // Process and Group
      const representantesMap = new Map<string, {
        abertos: number; bloqueados: number; fechados: number;
        nome: string; vendedorId: number;
        ordersAbertos: OrderDetail[]; ordersBloqueados: OrderDetail[]; ordersFechados: OrderDetail[];
      }>();

      pedidos.forEach(pedido => {
        const vendedorNome = pedido.VENDEDOR_NOME || pedido.NOME || 'Sem Representante';
        const vendedorId = pedido.VENDEDOR_ID ?? 0;

        if (!representantesMap.has(vendedorNome)) {
          representantesMap.set(vendedorNome, {
            abertos: 0, bloqueados: 0, fechados: 0, nome: vendedorNome, vendedorId,
            ordersAbertos: [], ordersBloqueados: [], ordersFechados: []
          });
        }

        const repData = representantesMap.get(vendedorNome)!;
        const pedidoId = pedido.ORCAMENTO_ID ?? pedido.PEDIDO_ID ?? pedido.ID ?? 0;
        const clienteId = pedido.CADASTRO_ID ?? 0;
        const valor = pedido.VALOR_TOTAL ?? pedido.VALOR_PEDIDO ?? pedido.VALOR_PRODUTOS ?? pedido.VALOR_DUPLICATA ?? 0;
        const clienteNome = pedido.CLIENTE_NOME || pedido.NOME_RAZAO_SOCIAL || pedido.NOME_FANTASIA || 'Cliente Diversos';
        
        const orderDetail: OrderDetail = {
          pedidoId, clienteId, clienteNome, valor,
          valorFrete: pedido.VALOR_FRETE_PROCESSADO,
          valorDesconto: pedido.VALOR_DESCONTO,
          dataHora: pedido.DATA_HORA_CADASTRO || '',
          dataEntrega: pedido.DATA_ENTREGA || null,
          bloqueado: pedido.BLOQUEADO === 'S'
        };

        if (pedido.BLOQUEADO === "S") {
          repData.bloqueados++; repData.ordersBloqueados.push(orderDetail);
        } else if (pedido.PEDIDO_FECHADO === "S") {
          repData.fechados++; repData.ordersFechados.push(orderDetail);
        } else {
          repData.abertos++; repData.ordersAbertos.push(orderDetail);
        }
      });

      const cols: Record<PedidoStatus, RepresentanteAgrupado[]> = { Abertos: [], Bloqueados: [], Fechados: [] };
      const dateStr = new Date().toLocaleDateString("pt-BR");

      representantesMap.forEach((data, nome) => {
        if (data.abertos > 0) cols.Abertos.push({ id: `aberto-${nome}`, representanteNome: nome, vendedorId: data.vendedorId, title: nome, priority: "Medium", status: "Abertos", count: data.abertos, date: dateStr, orders: data.ordersAbertos });
        if (data.bloqueados > 0) cols.Bloqueados.push({ id: `bloq-${nome}`, representanteNome: nome, vendedorId: data.vendedorId, title: nome, priority: "Medium", status: "Bloqueados", count: data.bloqueados, date: dateStr, orders: data.ordersBloqueados });
        if (data.fechados > 0) cols.Fechados.push({ id: `fechado-${nome}`, representanteNome: nome, vendedorId: data.vendedorId, title: nome, priority: "Medium", status: "Fechados", count: data.fechados, date: dateStr, orders: data.ordersFechados });
      });

      setColumns(cols);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro genérico');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" fontWeight="bold">Kanban de Pedidos (ERP)</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', gap: 3, flexWrap: { xs: 'wrap', md: 'nowrap' }, overflowX: 'auto', pb: 2 }}>
           <KanbanColumn columnId="Abertos" representantes={columns.Abertos} />
           <KanbanColumn columnId="Bloqueados" representantes={columns.Bloqueados} />
           <KanbanColumn columnId="Fechados" representantes={columns.Fechados} />
        </Box>
      )}
    </Box>
  );
}

PedidosKanban.usesAppLayout = false;
