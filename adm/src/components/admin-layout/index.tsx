import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import PeopleIcon from '@mui/icons-material/People'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import DashboardIcon from '@mui/icons-material/Dashboard'

const DRAWER_WIDTH = 260

const navItems = [
  { path: '/users', label: 'Users', icon: <PeopleIcon /> },
  { path: '/pdfs', label: 'PDFs', icon: <PictureAsPdfIcon /> },
]

export function AdminLayout() {
  const [open, setOpen] = useState(true)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={() => setOpen(!open)}
            edge="start"
            sx={{ mr: 1 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DashboardIcon color="primary" />
            <Typography variant="h6" component="span" fontWeight={600}>
              H2 Admin
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? DRAWER_WIDTH : 72,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? DRAWER_WIDTH : 72,
            boxSizing: 'border-box',
            top: 64,
            height: 'calc(100% - 64px)',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            overflowX: 'hidden',
          },
        }}
      >
        <List sx={{ pt: 2, px: open ? 1 : 0.5 }}>
          {navItems.map((item) => (
            <ListItemButton
              key={item.path}
              component={NavLink}
              to={item.path}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                justifyContent: open ? 'flex-start' : 'center',
                px: open ? 2 : 1,
                '&.active': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: open ? 40 : 0 }}>{item.icon}</ListItemIcon>
              {open && <ListItemText primary={item.label} />}
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px',
          ml: 0,
          minWidth: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
