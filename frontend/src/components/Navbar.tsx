import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Notifications,
  Warning,
  Dashboard,
  Gavel,
  Chat,
  Report,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState, AppDispatch } from '../store/store';
import { logout } from '../store/slices/authSlice';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { emergencyMode } = useSelector((state: RootState) => state.sos);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    handleMenuClose();
    navigate('/');
  };

  const navigationItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Dashboard },
    { label: 'Cases', path: '/cases', icon: Gavel },
    { label: 'SOS', path: '/sos', icon: Warning },
    { label: 'Chat', path: '/chat', icon: Chat },
    { label: 'Reports', path: '/reports', icon: Report },
  ];

  const isActivePage = (path: string) => location.pathname === path;

  return (
    <AppBar 
      position="sticky" 
      sx={{ 
        backgroundColor: emergencyMode ? 'error.main' : 'primary.main',
        transition: 'background-color 0.3s ease',
      }}
    >
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{ 
            flexGrow: 0, 
            mr: 4,
            fontWeight: 700,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          NyayaMitra
        </Typography>

        {/* Navigation Links */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1, gap: 1 }}>
          {navigationItems.map(({ label, path, icon: Icon }) => (
            <Button
              key={path}
              color="inherit"
              startIcon={<Icon />}
              onClick={() => navigate(path)}
              sx={{
                backgroundColor: isActivePage(path) ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              {label}
            </Button>
          ))}
        </Box>

        {/* Mobile menu button */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1 }}>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Right side items */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {emergencyMode && (
            <Badge color="error" variant="dot">
              <Warning sx={{ color: 'white' }} />
            </Badge>
          )}
          
          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <Badge badgeContent={0} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Account">
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenuClick}
              color="inherit"
            >
              {user?.avatar ? (
                <Avatar src={user.avatar} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              {user?.firstName} {user?.lastName}
            </Typography>
          </MenuItem>
          <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;