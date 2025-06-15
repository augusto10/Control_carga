import { useState, useEffect } from 'react';
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
  Avatar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Receipt as ReceiptIcon,
  PlaylistAdd as PlaylistAddIcon,
  ListAlt as ListAltIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
  Search as SearchIcon,
  Link as LinkIcon,
  ExpandLess,
  ExpandMore,
  Person as PersonIcon,
  LocalShipping as TruckIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/router';

const drawerWidth = 260;

// Estilos para o menu expandido
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
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
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 1.5),
  ...theme.mixins.toolbar,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
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
    ...(open ? openedMixin(theme) : closedMixin(theme)),
  },
}));

const MenuItemButton = styled(ListItemButton)(({ theme }) => ({
  minHeight: 48,
  borderRadius: theme.shape.borderRadius,
  margin: theme.spacing(0.5, 1.5),
  padding: theme.spacing(1, 2),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
  },
  '&.active': {
    backgroundColor: alpha(theme.palette.primary.main, 0.15),
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.main,
    },
    '& .MuiListItemText-primary': {
      fontWeight: 600,
      color: theme.palette.primary.main,
    },
  },
}));

const SubMenuItemButton = styled(MenuItemButton)(({ theme }) => ({
  paddingLeft: theme.spacing(4),
  minHeight: 40,
  margin: theme.spacing(0.2, 1.5),
  '&.active': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    '& .MuiListItemIcon-root': {
      color: theme.palette.primary.main,
    },
  },
}));

const menuItems = [
  { 
    text: 'Início', 
    icon: <HomeIcon />, 
    path: '/',
    exact: true
  },
  { 
    text: 'Notas', 
    icon: <ReceiptIcon />,
    subItems: [
      { 
        text: 'Adicionar Notas', 
        icon: <PlaylistAddIcon fontSize="small" />, 
        path: '/adicionar-notas' 
      },
      { 
        text: 'Consultar Notas', 
        icon: <SearchIcon fontSize="small" />, 
        path: '/consultar-notas' 
      },
      { 
        text: 'Vincular Notas', 
        icon: <LinkIcon fontSize="small" />, 
        path: '/vincular-notas' 
      },
    ]
  },
  { 
    text: 'Controles', 
    icon: <TruckIcon />,
    subItems: [
      { 
        text: 'Criar Controle', 
        icon: <PlaylistAddIcon fontSize="small" />, 
        path: '/criar-controle' 
      },
      { 
        text: 'Listar Controles', 
        icon: <ListAltIcon fontSize="small" />, 
        path: '/listar-controles' 
      },
    ]
  },
  { 
    text: 'Relatórios', 
    icon: <ReportIcon />,
    path: '/relatorios'
  },
];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const theme = useTheme();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(!isMobile);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>({});

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
    setOpen(!open);
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
            mr: open ? 2 : 'auto',
            justifyContent: 'center',
            color: active ? 'primary.main' : 'text.secondary',
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText 
          primary={item.text} 
          primaryTypographyProps={{
            fontWeight: active ? 600 : 'normal',
            color: active ? 'text.primary' : 'text.secondary',
          }} 
          sx={{ opacity: open ? 1 : 0 }} 
        />
        {hasSubItems && open && (
          isSubmenuOpen ? <ExpandLess /> : <ExpandMore />
        )}
      </>
    );

    const ButtonComponent = isSubmenu ? SubMenuItemButton : MenuItemButton;

    if (hasSubItems) {
      return (
        <div key={item.text}>
          <ButtonComponent {...buttonProps}>
            {content}
          </ButtonComponent>
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems.map((subItem: any) => (
                <Link href={subItem.path} key={subItem.path} passHref>
                  <SubMenuItemButton 
                    className={isActive(subItem.path, true) ? 'active' : ''}
                  >
                    <ListItemIcon sx={{ minWidth: 0, mr: 2, justifyContent: 'center' }}>
                      {subItem.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={subItem.text} 
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        color: isActive(subItem.path, true) ? 'primary.main' : 'text.secondary',
                      }}
                      sx={{ opacity: open ? 1 : 0 }} 
                    />
                  </SubMenuItemButton>
                </Link>
              ))}
            </List>
          </Collapse>
        </div>
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
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            edge="start"
            sx={{
              marginRight: 2,
              color: 'text.primary',
            }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="h6" noWrap component="div" sx={{ color: 'text.primary' }}>
              Controle de Carga
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="Perfil">
              <IconButton sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <PersonIcon />
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      
      <StyledDrawer 
        variant="permanent" 
        open={open}
        sx={{
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : `calc(${theme.spacing(7)} + 1px)`,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TruckIcon />
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>
              {open && 'Controle Carga'}
            </Typography>
          </Box>
          <IconButton onClick={toggleDrawer} size="small" sx={{ color: 'inherit' }}>
            {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </DrawerHeader>
        
        <Divider />
        
        <Box sx={{ overflow: 'auto', height: 'calc(100vh - 64px)', py: 1 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                {renderMenuItem(item)}
              </ListItem>
            ))}
          </List>
          
          {/* Espaço para informações do usuário no rodapé */}
          <Box sx={{ p: 2, mt: 'auto', borderTop: `1px solid ${theme.palette.divider}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: open ? 1 : 0 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <PersonIcon fontSize="small" />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" noWrap>Usuário</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  Admin
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </StyledDrawer>
      
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: '100%', 
          mt: '64px',
          backgroundColor: theme.palette.background.default,
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
