import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Music,
  Heart,
  History,
  PlusCircle,
  LogOut,
  Disc,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/', icon: Home, label: 'Início' },
  { path: '/converter', icon: PlusCircle, label: 'Converter' },
  { path: '/playlist', icon: Music, label: 'Playlist' },
  { path: '/favorites', icon: Heart, label: 'Favoritos' },
  { path: '/history', icon: History, label: 'Histórico' },
];

export function Sidebar() {
  const location = useLocation();
  const { logout, user } = useAuthStore();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed left-0 top-0 z-40 h-full w-[280px] bg-sidebar border-r border-border"
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
            <Disc className="h-6 w-6 text-primary-foreground animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">
              MP3 Converter
            </h1>
            <p className="text-xs text-sidebar-foreground/60">YouTube to MP3</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 transition-transform duration-200',
                        isActive ? '' : 'group-hover:scale-110'
                      )}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 h-8 w-1 rounded-r-full bg-primary"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold">
              {user?.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.nome}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
