import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import GlobalBackground from './GlobalBackground';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import { 
  Box, 
  Drawer, 
  List, 
  Divider, 
  IconButton, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Typography,
  Toolbar,
  AppBar as MuiAppBar,
  AppBarProps,
  useMediaQuery,
  Collapse,
  alpha,
  Tooltip,
  Avatar,
  Button,
  Menu,
  MenuItem,
  SwipeableDrawer
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  FactCheck as FactCheckIcon,
  Groups as GroupsIcon,
  Inventory2 as InventoryIcon,
  LocalShipping as TruckIcon,
  Assessment as ReportIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  EmojiEvents as TrophyIcon,
  Leaderboard as LeaderboardIcon,
  Person as PersonIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess,
  ExpandMore,
  Receipt as ReceiptIcon,
  PlaylistAdd as PlaylistAddIcon,
  ListAlt as ListAltIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Search as SearchIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingUpIcon,
  BusinessCenter as BusinessIcon,
  Star as StarIcon,
  Insights as InsightsIcon,
  Print as PrintIcon,
  // Novos ícones modernos
  HomeRounded as HomeIcon,
  DescriptionRounded as DocumentIcon,
  AddCircleOutlineRounded as AddIcon,
  SearchRounded as SearchModernIcon,
  QrCodeScannerRounded as QrIcon,
  AssignmentRounded as ChecklistModernIcon,
  AssessmentRounded as ReportsIcon,
  NotificationsActiveRounded as AlertsIcon,
  PeopleRounded as PeopleIcon,
  VerifiedUserRounded as VerifiedIcon,
  WorkspacesRounded as WorkspaceIcon,
  InventoryRounded as InventoryModernIcon,
  RequestQuoteRounded as RequestIcon,
  ApprovalRounded as ApprovalIcon,
  BarChartRounded as ChartIcon,
  AccountCircleRounded as ProfileIcon,
  StarRounded as StarModernIcon,
  EmojiEventsRounded as TrophyModernIcon,
  TimelineRounded as TimelineModernIcon,
  BusinessCenterRounded as BusinessModernIcon,
  LocalShippingRounded as ShippingIcon,
  ReceiptLongRounded as ReceiptModernIcon,
  PrintRounded as PrintModernIcon
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';

const drawerWidth = 260;

// Estilos para o menu expandido
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: '#ffffff',
  boxShadow: '4px 0 20px rgba(0,0,0,0.08)',
  borderRight: '1px solid rgba(255, 107, 53, 0.15)',
});

// Estilos para o menu recolhido
const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
  backgroundColor: '#ffffff',
  boxShadow: '4px 0 20px rgba(0,0,0,0.08)',
  borderRight: '1px solid rgba(255, 107, 53, 0.15)',
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 2),
  ...theme.mixins.toolbar,
  borderBottom: '1px solid rgba(25, 118, 210, 0.2)',
  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
  color: '#ffffff',
  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '1px',
    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
  }
}));

interface AppBarPropsExtended extends AppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarPropsExtended>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  background: 'linear-gradient(135deg, #1976d2 0%, #1976d2 100%)',
  color: '#ffffff',
  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
  backdropFilter: 'blur(10px)',
  borderBottom: '1px solid rgba(25, 118, 210, 0.2)',
  [theme.breakpoints.up('md')]: {
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  },
}));

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open = false }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '& .MuiDrawer-paper': {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    borderRight: 'none',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    boxShadow: '4px 0 20px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(8px)',
    ...(open ? openedMixin(theme) : closedMixin(theme)),
  },
}));

const MenuItemButton = styled(ListItemButton)(({ theme }) => ({
  minHeight: 52,
  borderRadius: '12px',
  margin: theme.spacing(0.5, 1.5),
  paddingLeft: theme.spacing(2.5),
  paddingRight: theme.spacing(2),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
  overflow: 'hidden',
  // Mobile-first adjustments
  [theme.breakpoints.down('sm')]: {
    minHeight: 56,
    padding: theme.spacing(1.5, 2),
    margin: theme.spacing(0.3, 1),
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '4px',
    background: 'transparent',
    transition: 'all 0.3s ease',
  },
  '&.active': {
    background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.15) 0%, rgba(66, 165, 245, 0.1) 100%)',
    boxShadow: '0 4px 20px rgba(25, 118, 210, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
    border: '1px solid rgba(25, 118, 210, 0.3)',
    '&::before': {
      background: 'linear-gradient(180deg, #1976d2 0%, #1976d2 100%)',
    },
    '& .MuiListItemIcon-root': {
      color: '#1976d2',
      transform: 'scale(1.1)',
    },
    '& .MuiListItemText-primary': {
      color: '#1e293b',
      fontWeight: 600,
    },
  },
  '&:hover': {
    background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(66, 165, 245, 0.05) 100%)',
    transform: 'translateX(4px)',
    boxShadow: '0 6px 25px rgba(25, 118, 210, 0.15)',
    // Desabilita efeitos hover em touchscreen
    '@media (hover: none)': {
      transform: 'none',
    },
    '&::before': {
      background: 'linear-gradient(180deg, #1976d2 0%, #1976d2 100%)',
      width: '3px',
    },
    '& .MuiListItemIcon-root': {
      color: '#1976d2',
      transform: 'scale(1.05)',
    },
    '& .MuiListItemText-primary': {
      color: '#1e293b', fontWeight: 500,
    },
  },
}));

const SubMenuItemButton = styled(MenuItemButton)(({ theme }) => ({
  paddingLeft: theme.spacing(4.5),
  minHeight: 44,
  margin: theme.spacing(0.3, 2),
  borderRadius: '10px',
  '&::before': {
    width: '2px',
  },
  '&.active': {
    background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.12) 0%, rgba(66, 165, 245, 0.08) 100%)',
    '&::before': {
      background: '#1976d2',
    },
    '& .MuiListItemIcon-root': {
      color: '#1976d2',
    },
    '& .MuiListItemText-primary': {
      color: '#1e293b', fontWeight: 500,
    },
  },
  '&:hover': {
    transform: 'translateX(2px)',
    '& .MuiListItemText-primary': {
      color: '#1e293b',
    },
  },
}));

const menuItems = [
  { 
    text: 'Dashboard', 
    icon: <HomeIcon sx={{ fontSize: 22 }} />, 
    path: '/',
    exact: true
  },
  {
    text: 'Painel Gerencial',
    icon: <ChartIcon sx={{ fontSize: 22 }} />,
    path: '/painel-gerencial',
    adminOnly: true
  },
  { 
    text: 'Gestão de Notas', 
    icon: <ReceiptModernIcon sx={{ fontSize: 22 }} />,
    subItems: [
      { 
        text: 'Adicionar Notas', 
        icon: <AddIcon sx={{ fontSize: 20 }} />, 
        path: '/adicionar-notas' 
      },
      { 
        text: 'Gerar Etiquetas', 
        icon: <QrIcon sx={{ fontSize: 20 }} />, 
        path: '/gerar-etiquetas' 
      },
      { 
        text: 'Consultar Notas', 
        icon: <SearchModernIcon sx={{ fontSize: 20 }} />, 
        path: '/listar-notas' 
      }
    ]
  },
  {
    text: 'Controle de Carga',
    icon: <ShippingIcon sx={{ fontSize: 22 }} />,
    subItems: [
      { 
        text: 'Criar Controle', 
        icon: <AddIcon sx={{ fontSize: 20 }} />, 
        path: '/criar-controle' 
      },
      { 
        text: 'Listar Controles', 
        icon: <DocumentIcon sx={{ fontSize: 20 }} />, 
        path: '/listar-controles' 
      },
    ]
  },
  {
    text: 'Checklist Recebimento',
    icon: <ChecklistModernIcon sx={{ fontSize: 22 }} />,
    subItems: [
      {
        text: 'Novo Checklist',
        icon: <AddIcon sx={{ fontSize: 20 }} />,
        path: '/checklist-recebimento/regras-ouro'
      },
      {
        text: 'Relatórios Checklist',
        icon: <ReportsIcon sx={{ fontSize: 20 }} />,
        path: '/checklist-recebimento/relatorios'
      },
      {
        text: 'Alertas de Validade',
        icon: <AlertsIcon sx={{ fontSize: 20 }} />,
        path: '/checklist-recebimento/relatorio-validade'
      },
      {
        text: 'Relatórios Avançados',
        icon: <ChartIcon sx={{ fontSize: 20 }} />,
        path: '/checklist-recebimento/relatorios-avancados'
      }
    ]
  },
  {
    text: 'Separação e Conferência',
    icon: <VerifiedIcon sx={{ fontSize: 22 }} />,
    subItems: [
      {
        text: 'Cadastrar Separação',
        icon: <AddIcon sx={{ fontSize: 20 }} />,
        path: '/separacao-conferencia/separadores'
      },
      {
        text: 'Separadores',
        icon: <PeopleIcon sx={{ fontSize: 20 }} />,
        path: '/separacao-conferencia/separadores'
      },
      {
        text: 'Confirmar Separação',
        icon: <VerifiedIcon sx={{ fontSize: 20 }} />,
        path: '/separacao-conferencia/confirmar-auditoria'
      },
      {
        text: 'Relatório de Separação',
        icon: <ReportsIcon sx={{ fontSize: 20 }} />,
        path: '/separacao-conferencia/conferentes'
      },
      {
        text: 'Auditores',
        icon: <VerifiedIcon sx={{ fontSize: 20 }} />,
        path: '/separacao-conferencia/auditores'
      },
      {
        text: 'Gerentes',
        icon: <AdminIcon sx={{ fontSize: 20 }} />,
        path: '/separacao-conferencia/gerentes'
      }
    ]
  },
  {
    text: 'Separation Pro',
    icon: <TrophyModernIcon sx={{ fontSize: 22, color: '#ffd700' }} />,
    subItems: [
      {
        text: 'Ranking',
        icon: <LeaderboardIcon sx={{ fontSize: 20 }} />,
        path: '/gamificacao/ranking'
      },
      {
        text: 'Meu Histórico',
        icon: <TimelineModernIcon sx={{ fontSize: 20 }} />,
        path: '/gamificacao/historico'
      }
    ]
  },
  {
    text: 'Operações',
    icon: <WorkspaceIcon sx={{ fontSize: 22 }} />,
    subItems: [
      {
        text: 'Checklist Empilhadeiras',
        icon: <ChecklistModernIcon sx={{ fontSize: 20 }} />,
        path: '/checklist-empilhadeiras'
      },
      {
        text: 'Motoristas',
        icon: <SpeedIcon sx={{ fontSize: 20 }} />,
        path: '/admin/motoristas'
      },
      {
        text: 'Funcionários',
        icon: <PeopleIcon sx={{ fontSize: 20 }} />,
        path: '/funcionarios',
        adminOnly: true
      },
      {
        text: 'Clientes',
        icon: <BusinessModernIcon sx={{ fontSize: 20 }} />,
        path: '/clientes',
        adminOnly: true
      }
    ]
  },
  {
    text: 'Controle de Materiais',
    icon: <InventoryModernIcon sx={{ fontSize: 22 }} />,
    subItems: [
      {
        text: 'Cadastro de Materiais',
        icon: <AddIcon sx={{ fontSize: 20 }} />,
        path: '/materiais/cadastro',
        roles: ['ADMIN', 'GERENTE'] // Apenas ADMIN e GERENTE
      },
      {
        text: 'Solicitar Materiais',
        icon: <RequestIcon sx={{ fontSize: 20 }} />,
        path: '/materiais/solicitar',
        roles: ['ADMIN', 'GERENTE', 'SEPARADOR', 'CONFERENTE', 'AUDITOR', 'USUARIO'] // Todos podem solicitar
      },
      {
        text: 'Aprovar Solicitações',
        icon: <ApprovalIcon sx={{ fontSize: 20 }} />,
        path: '/materiais/aprovar',
        roles: ['ADMIN', 'GERENTE'] // Apenas ADMIN e GERENTE podem aprovar
      },
      {
        text: 'Relatórios',
        icon: <ReportsIcon sx={{ fontSize: 20 }} />,
        path: '/materiais/relatorios',
        roles: ['ADMIN', 'GERENTE'] // Apenas ADMIN e GERENTE
      }
    ]
  },
  { 
    text: 'Relatórios e Análises', 
    icon: <ChartIcon sx={{ fontSize: 22 }} />,
    subItems: [
      {
        text: 'Relatório de Pallets',
        icon: <AnalyticsIcon sx={{ fontSize: 20 }} />,
        path: '/relatorios/pallets'
      },
      {
        text: 'Relatório de Controles',
        icon: <ReportsIcon sx={{ fontSize: 20 }} />,
        path: '/relatorios/controles-carga'
      }
    ]
  },
  { 
    text: 'Meu Perfil', 
    icon: <ProfileIcon sx={{ fontSize: 22 }} />,
    path: '/perfil'
  },
];

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});
  const menuOpen = Boolean(anchorEl);
  
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  useEffect(() => {
    if (isMobile) {
      setOpen(false);
    } else {
      setOpen(true);
    }
  }, [isMobile]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    router.push('/login');
  };

  // Inicializa os submenus abertos com base na rota atual
  useEffect(() => {
    const initialSubmenus: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.subItems) {
        const isActive = item.subItems.some(subItem => 
          router.pathname === subItem.path || 
          (subItem.path !== '/' && router.pathname.startsWith(subItem.path))
        );
        if (isActive) {
          initialSubmenus[item.text] = true;
        }
      }
    });
    setOpenSubmenus(initialSubmenus);
  }, [router.pathname]);

  const toggleDrawer = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen);
    } else {
      setOpen(!open);
    }
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleSubmenu = (itemText: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [itemText]: !prev[itemText]
    }));
  };

  const isActive = (path: string, exact = false) => {
    return exact 
      ? router.pathname === path
      : router.pathname.startsWith(path);
  };

  const renderMenuItem = (item: any, isSubmenu = false) => {
    const active = isActive(item.path, item.exact);
    const hasSubItems = !!item.subItems;
    const isSubmenuOpen = openSubmenus[item.text] || false;

    const buttonProps = {
      component: 'div',
      className: active ? 'active' : '',
      onClick: hasSubItems 
        ? () => toggleSubmenu(item.text)
        : () => {},
    };

    const content = (
      <>
        <ListItemIcon 
          sx={{ 
            minWidth: 0, 
            mr: open || isMobile ? 2 : 'auto',
            color: active ? '#1976d2' : '#64748b',
            fontSize: isMobile ? '1.3rem' : '1.1rem',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: active 
              ? 'linear-gradient(135deg, rgba(25, 118, 210, 0.1) 0%, rgba(66, 165, 245, 0.05) 100%)'
              : 'transparent',
            border: active ? '1px solid rgba(25, 118, 210, 0.2)' : '1px solid transparent',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.08) 0%, rgba(66, 165, 245, 0.04) 100%)',
              transform: 'scale(1.05)',
              border: '1px solid rgba(25, 118, 210, 0.15)'
            }
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText 
          primary={item.text} 
          primaryTypographyProps={{
            fontWeight: active ? 600 : 500,
            color: active ? '#1e293b' : '#475569',
            fontSize: isMobile ? '0.95rem' : '0.9rem',
            letterSpacing: '0.3px',
          }} 
          sx={{ 
            opacity: open || isMobile ? 1 : 0,
            '& .MuiTypography-root': {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }
          }} 
        />
        {hasSubItems && (open || isMobile) && (
          isSubmenuOpen ? <ExpandLess /> : <ExpandMore />
        )}
      </>
    );

    const ButtonComponent = isSubmenu ? SubMenuItemButton : MenuItemButton;

    if (hasSubItems) {
      return (
        <React.Fragment key={item.text}>
          <ButtonComponent {...buttonProps}>
            {content}
          </ButtonComponent>
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems
                .filter((subItem: any) => {
                  if (!user) return false;
                  
                  // Se o subitem tem roles definidas, verifica permissão
                  if (subItem.roles && Array.isArray(subItem.roles)) {
                    return subItem.roles.includes(user.tipo);
                  }
                  
                  // Lógica específica para 'Separação e Conferência'
                  if (item.text === 'Separação e Conferência') {
                    const userRole = user.tipo;
                    if (userRole === 'ADMIN' || userRole === 'GERENTE') return true;

                    const path = subItem.path.toLowerCase();
                    const itemText = subItem.text.toLowerCase();

                    if (userRole === 'SEPARADOR' && (path.includes('separadores') || itemText.includes('cadastrar separação'))) return true;
                    if (userRole === 'CONFERENTE' && (path.includes('conferentes') || itemText.includes('confirmar separação') || itemText.includes('relatório de separação'))) return true;
                    if (userRole === 'AUDITOR' && (path.includes('auditores') || itemText.includes('confirmar separação'))) return true;

                    return false;
                  }

                  // CONFERENTE e SEPARADOR têm acesso restrito - só aos menus específicos
                  if (user?.tipo === 'CONFERENTE' || user?.tipo === 'SEPARADOR') {
                    // Permite acesso ao menu "Controle de Materiais" (para solicitar mercadorias)
                    if (item.text === 'Controle de Materiais') return true;
                    // Permite acesso ao menu "Separation Pro" (ranking e histórico)
                    if (item.text === 'Separation Pro') return true;
                    return false;
                  }

                  // Para outros menus sem roles, mostra tudo (apenas para ADMIN, GERENTE, USUARIO, etc.)
                  return true;
                })
                .map((subItem: any) => (
                  <Link href={subItem.path} key={subItem.path} passHref>
                    <SubMenuItemButton
                      className={isActive(subItem.path, true) ? 'active' : ''}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: 0, 
                        mr: 2, 
                        color: isActive(subItem.path, true) ? '#1976d2' : '#94a3b8',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        background: isActive(subItem.path, true) 
                          ? 'rgba(25, 118, 210, 0.08)' 
                          : 'transparent',
                        '&:hover': {
                          background: 'rgba(25, 118, 210, 0.06)',
                          transform: 'scale(1.05)'
                        }
                      }}>
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={subItem.text} 
                        primaryTypographyProps={{
                          fontSize: '0.9rem',
                          color: isActive(subItem.path, true) ? 'primary.main' : 'text.secondary',
                        }} 
                        /* Garantir que em mobile (isMobile) o texto dos subitens apareça mesmo quando o drawer estiver 'fechado' */
                        sx={{ opacity: open || isMobile ? 1 : 0 }}
                      />
                    </SubMenuItemButton>
                  </Link>
                ))}
            </List>
          </Collapse>
        </React.Fragment>
      );
    }

    return (
      <Link href={item.path} key={item.path} passHref>
        <ButtonComponent className={active ? 'active' : ''}>
          {content}
        </ButtonComponent>
      </Link>
    );
  };

  return (
    <GlobalBackground>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" open={!isMobile && open} elevation={0}>
        {/* Adicionado elevation={0} para remover a sombra padrão do AppBar */}
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{
              marginRight: { xs: 1, sm: 2 },
              color: 'white',
              padding: { xs: '10px', sm: '8px' },
            }}
          >
            <MenuIcon sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem' } }} />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                color: 'white',
                fontSize: { xs: '1rem', sm: '1.25rem' },
                fontWeight: 600,
                display: { xs: isMobile ? 'block' : 'none', sm: 'block' }
              }}
            >
              Controle de Carga
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              onClick={handleMenuClick}
              size="small"
              sx={{ ml: 2, textTransform: 'none' }}
              aria-controls={menuOpen ? 'user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? 'true' : undefined}
              startIcon={
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }} src={user?.foto || undefined}>
                  {!user?.foto && (user?.nome?.charAt(0).toUpperCase() || <PersonIcon />)}
                </Avatar>
              }
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mr: 1 }}>
                <Typography variant="subtitle2" color="text.primary" noWrap>
                  {user?.nome || 'Usuário'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user?.tipo || 'Nível de Acesso'}
                </Typography>
              </Box>
            </Button>
            <Menu
              anchorEl={anchorEl}
              id="user-menu"
              open={menuOpen}
              onClose={handleMenuClose}
              onClick={handleMenuClose}
              PaperProps={{
                elevation: 3,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                  '&:before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 14,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => router.push('/perfil')}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                Meu Perfil
              </MenuItem>
              {user?.tipo === 'ADMIN' && (
                <MenuItem onClick={() => router.push('/admin')}>
                  <ListItemIcon>
                    <AdminIcon fontSize="small" />
                  </ListItemIcon>
                  Painel Admin
                </MenuItem>
              )}
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Sair
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer */}
      {isMobile ? (
        <SwipeableDrawer
          anchor="left"
          open={mobileOpen}
          onClose={handleDrawerClose}
          onOpen={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          PaperProps={{
            sx: {
              width: '85%',
              maxWidth: drawerWidth,
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
              borderRight: 'none',
              boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
            },
          }}
        >
          <DrawerHeader>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                color: '#ffffff',
                fontSize: '1.1rem',
                whiteSpace: 'nowrap'
              }}>
                Controle de Carga
              </Typography>
            </Box>
            <IconButton 
              onClick={handleDrawerClose} 
              sx={{ 
                color: '#ffffff',
                padding: '12px',
                '& svg': {
                  fontSize: '1.5rem'
                }
              }}
            >
              <ChevronLeftIcon />
            </IconButton>
          </DrawerHeader>
          <Divider />
          <Box sx={{ 
            overflow: 'auto', 
            height: 'calc(100vh - 64px)', 
            py: 2,
          }}>
            <List>
              {menuItems
                .filter((item) => {
                  // Filtrar itens administrativos se o usuário não for ADMIN ou GERENTE
                  if (item.adminOnly && user?.tipo !== 'ADMIN' && user?.tipo !== 'GERENTE') {
                    return false;
                  }

                  // CONFERENTE e SEPARADOR têm acesso apenas aos menus específicos
                  if (user?.tipo === 'CONFERENTE' || user?.tipo === 'SEPARADOR') {
                    const allowedMenus = ['Separação e Conferência', 'Controle de Materiais', 'Separation Pro', 'Meu Perfil'];
                    return allowedMenus.includes(item.text);
                  }

                  return true;
                })
                .map((item) => (
                  <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                    {renderMenuItem(item)}
                  </ListItem>
                ))}
            </List>
            
            {/* Espaço para informações do usuário no rodapé */}
            <Box sx={{ 
              p: 2, 
              mt: 'auto', 
              borderTop: '1px solid rgba(25, 118, 210, 0.2)', 
              background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(66, 165, 245, 0.05) 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ 
                  width: 36, 
                  height: 36, 
                  background: 'linear-gradient(135deg, #1976d2 0%, #1976d2 100%)',
                  fontWeight: 600,
                  fontSize: '1.1rem'
                }} src={user?.foto || undefined}>
                  {!user?.foto && (user?.nome?.charAt(0).toUpperCase() || <PersonIcon fontSize="small" />)}
                </Avatar>
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    noWrap
                    sx={{
                      fontWeight: 600,
                      color: '#1e293b',
                      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                    }}
                  >
                    {user?.nome || 'Usuário'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    noWrap
                    sx={{
                      color: '#1976d2',
                      fontWeight: 500
                    }}
                  >
                    {user?.tipo || 'Nível de Acesso'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </SwipeableDrawer>
      ) : (
        /* Desktop Drawer */
        <StyledDrawer 
          variant="permanent" 
          open={open}
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: open ? drawerWidth : `calc(${theme.spacing(7)} + 1px)`,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          <Box sx={{ 
            overflow: 'auto', 
            height: 'calc(100vh - 64px)', 
            py: 2,
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
          }}>
            <List>
              {menuItems
                .filter((item) => {
                  // Filtrar itens administrativos se o usuário não for ADMIN ou GERENTE
                  if (item.adminOnly && user?.tipo !== 'ADMIN' && user?.tipo !== 'GERENTE') {
                    return false;
                  }

                  // CONFERENTE e SEPARADOR têm acesso apenas aos menus específicos
                  if (user?.tipo === 'CONFERENTE' || user?.tipo === 'SEPARADOR') {
                    const allowedMenus = ['Separação e Conferência', 'Controle de Materiais', 'Separation Pro', 'Meu Perfil'];
                    return allowedMenus.includes(item.text);
                  }

                  return true;
                })
                .map((item) => (
                  <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                    {renderMenuItem(item)}
                  </ListItem>
                ))}
            </List>
            
            {/* Espaço para informações do usuário no rodapé */}
            <Box sx={{ 
              p: 2,
              mt: 'auto',
              borderTop: '1px solid rgba(25, 118, 210, 0.2)',
              /* Mostrar o bloco do usuário no rodapé também em mobile */
              opacity: open || isMobile ? 1 : 0,
              background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.05) 0%, rgba(66, 165, 245, 0.05) 100%)',
              borderRadius: '12px 12px 0 0'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ 
                  width: 36, 
                  height: 36, 
                  background: 'linear-gradient(135deg, #1976d2 0%, #1976d2 100%)',
                  fontWeight: 600,
                  fontSize: '1.1rem'
                }} src={user?.foto || undefined}>
                  {!user?.foto && (user?.nome?.charAt(0).toUpperCase() || <PersonIcon fontSize="small" />)}
                </Avatar>
                <Box>
                  <Typography 
                    variant="subtitle2" 
                    noWrap
                    sx={{
                      fontWeight: 600,
                      color: '#1e293b',
                      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                    }}
                  >
                    {user?.nome || 'Usuário'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    noWrap
                    sx={{
                      color: '#1976d2',
                      fontWeight: 500
                    }}
                  >
                    {user?.tipo || 'Nível de Acesso'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </StyledDrawer>
      )}
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: { xs: 1.5, sm: 2, md: 3 }, 
          width: '100%', 
          mt: { xs: '56px', sm: '64px' },
          ml: { xs: 0, md: !isMobile && open ? 0 : 0 },
          background: 'transparent',
          minHeight: { xs: 'calc(100vh - 56px)', sm: 'calc(100vh - 64px)' },
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
    </GlobalBackground>
  );
};

export default Layout;
