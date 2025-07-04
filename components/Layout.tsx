import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

import { useSession, signOut } from 'next-auth/react';
import { 
  Drawer,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  Badge,
  Box,
  Button,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Paper,
  styled,
  alpha,
  useTheme,
  CSSObject,
  Avatar,
  Tooltip,
  AppBar as AppBarMaterial,
  Theme,
  ListItemButton,
  Menu as MenuMaterial,
  MenuItem as MenuItemMaterial,
  useMediaQuery
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import FireTruckIcon from '@mui/icons-material/FireTruck';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import Menu from '@mui/icons-material/Menu';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Settings from '@mui/icons-material/Settings';
import PlaylistAdd from '@mui/icons-material/PlaylistAdd';
import ListAlt from '@mui/icons-material/ListAlt';
import Search from '@mui/icons-material/Search';
import Assessment from '@mui/icons-material/Assessment';
import LogoutIcon from '@mui/icons-material/Logout';
import PlaylistAddCheck from '@mui/icons-material/PlaylistAddCheck';
import { motion } from 'framer-motion';
import { theme } from '../theme';
import Link from 'next/link';
import Image from 'next/image';

interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  exact?: boolean;
}

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 280;

// Estilos para o menu expandido
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
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
  backgroundColor: theme.palette.primary.dark,
  color: theme.palette.primary.contrastText,
});

const DrawerHeader = styled('div')(({ theme }: Theme) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  backgroundColor: alpha(theme.palette.primary.main, 0.9),
}));

const AppBar = styled(AppBarMaterial, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: theme.palette.primary.light,
  boxShadow: '0 2px 4px -1px rgb(0 0 0 / 0.2)',
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
    },
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

const Layout: React.FC<LayoutProps> = ({ children }: LayoutProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const { data: session, status } = useSession();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (path: string) => {
    router.push(path);
    if (isMobile) handleDrawerToggle();
  };

  const menuItems: MenuItem[] = [
    { 
      text: 'Início', 
      icon: <HomeIcon sx={{ color: 'inherit' }} />,
      path: '/',
      exact: true 
    },
    { 
      text: 'Adicionar Notas', 
      icon: <AddIcon sx={{ color: 'inherit' }} />,
      path: '/adicionar-notas',
      exact: false 
    },
    { 
      text: 'Consultar Notas', 
      icon: <ListAlt sx={{ color: 'inherit' }} />,
      path: '/listar-notas',
      exact: false 
    },
    { 
      text: 'Criar Controle', 
      icon: <PlaylistAdd sx={{ color: 'inherit' }} />,
      path: '/criar-controle',
      exact: false 
    },
    { 
      text: 'Listar Controles', 
      icon: <FireTruckIcon sx={{ color: 'inherit' }} />,
      path: '/listar-controles',
      exact: false 
    },
    { 
      text: 'Configurações', 
      icon: <Settings sx={{ color: 'inherit' }} />,
      path: '/configuracoes',
      exact: true 
    },
  ];
  // Fim do array de menuItems, iniciar retorno do componente
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBarMaterial position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2, ...(open && { display: 'none' }) }}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Controle de Carga
            </motion.span>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <IconButton color="inherit" sx={{ borderRadius: '12px' }}>
                <Search />
              </IconButton>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <IconButton color="inherit" sx={{ borderRadius: '12px' }}>
                <Assessment />
              </IconButton>
            </motion.div>
            {status === 'authenticated' ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                    {session?.user?.nome ? session.user.nome[0].toUpperCase() : (session?.user?.name ? session.user.name[0].toUpperCase() : <PersonIcon />)}
                  </Avatar>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {session?.user?.nome || session?.user?.name}
                  </Typography>
                </Box>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <IconButton color="inherit" onClick={handleMenu} sx={{ borderRadius: '12px' }}>
                    <PersonIcon />
                  </IconButton>
                </motion.div>
                <MenuMaterial
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  PaperProps={{
                    sx: {
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    },
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <MenuItemMaterial onClick={() => { router.push('/perfil'); handleClose(); }} sx={{ borderRadius: '12px' }}>
                      <ListItemIcon>
                        <PersonIcon sx={{ color: theme.palette.primary.main }} />
                      </ListItemIcon>
                      <ListItemText primary="Perfil" />
                    </MenuItemMaterial>
                    {session?.user?.tipo === 'ADMIN' && (
                      <MenuItemMaterial onClick={() => { router.push('/admin'); handleClose(); }} sx={{ borderRadius: '12px' }}>
                        <ListItemIcon>
                          <FireTruckIcon sx={{ color: theme.palette.secondary.main }} />
                        </ListItemIcon>
                        <ListItemText primary="Painel Admin" />
                      </MenuItemMaterial>
                    )}
                    <MenuItemMaterial onClick={handleLogout} sx={{ borderRadius: '12px' }}>
                      <ListItemIcon>
                        <LogoutIcon sx={{ color: theme.palette.error.main }} />
                      </ListItemIcon>
                      <ListItemText primary="Sair" />
                    </MenuItemMaterial>
                  </motion.div>
                </MenuMaterial>
              </>
            ) : (
              <>
                <Button color="inherit" href="/login" sx={{ fontWeight: 600 }}>
                  Entrar
                </Button>
                <Button color="primary" variant="contained" href="/cadastro" sx={{ fontWeight: 600 }}>
                  Cadastrar
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBarMaterial>
      <StyledDrawer variant="permanent" open={open}>
        <DrawerHeader>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <IconButton onClick={handleDrawerToggle}>
              {open ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
          </motion.div>
        </DrawerHeader>
        <Divider />
        <List>
           {status === 'authenticated' && menuItems
              .filter(item => item.text !== 'Configurações' || session?.user?.tipo === 'ADMIN')
              .map((item) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: item.text.length * 0.1 }}
                >
                  <ListItem
                    button
                    key={item.text}
                    onClick={() => handleMenuItemClick(item.path)}
                    selected={router.pathname === item.path}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.2),
                        },
                      },
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        transform: 'translateX(4px)',
                      }
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItem>
                </motion.div>
              ))}
           {status !== 'authenticated' && (
              <ListItem button onClick={() => router.push('/login')}>
                <ListItemIcon><PersonIcon /></ListItemIcon>
                <ListItemText primary="Entrar" />
              </ListItem>
            )}
            <ListItem disablePadding>
              <ListItemButton component={Link} href="/checklist">
                <ListItemIcon>
                  <PlaylistAddCheck />
                </ListItemIcon>
                <ListItemText primary="Checklist Empilhadeira" />
              </ListItemButton>
            </ListItem>
        </List>
        <Divider />
        <List>
          {['Motoristas', 'Transportadoras'].map((text, index) => (
            <motion.div
              key={text}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ListItem button key={text}>
                <ListItemIcon>
                  {text === 'Motoristas' ? <PersonIcon sx={{ color: 'inherit' }} /> : <FireTruckIcon sx={{ color: 'inherit' }} />}
                </ListItemIcon>
                <ListItemText primary={text} />
              </ListItem>
            </motion.div>
          ))}
        </List>
        <Box sx={{ mt: 'auto', p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
          <Typography variant="caption" align="center" color="text.secondary">
            {new Date().getFullYear()} Controle de Carga
          </Typography>
        </Box>
      </StyledDrawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.enteringScreen,
          }),
          ...(open && {
            ml: 0,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
          }),
          backgroundColor: theme.palette.background.default,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DrawerHeader />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {children}
        </motion.div>
      </Box>
    </Box>
  );
};

export default Layout;
