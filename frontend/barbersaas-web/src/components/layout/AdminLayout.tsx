import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Scissors, DollarSign,
  Target, Package, Settings, LogOut, Menu, X, ChevronRight, Sun, Moon
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { api } from '../../lib/api'
import { applyTenantTheme } from '../../lib/theme-tenant'

const nav = [
  { to: '/admin',           label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/admin/agenda',    label: 'Agenda',       icon: Calendar },
  { to: '/admin/clientes',  label: 'Clientes',     icon: Users },
  { to: '/admin/barbeiros', label: 'Barbeiros',    icon: Scissors },
  { to: '/admin/servicos',  label: 'Serviços',     icon: Scissors },
  { to: '/admin/financeiro',label: 'Financeiro',   icon: DollarSign },
  { to: '/admin/metas',     label: 'Metas',        icon: Target },
  { to: '/admin/produtos',  label: 'Produtos',     icon: Package },
  { to: '/admin/config',    label: 'Configurações',icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, toggle } = useThemeStore()

  // Aplica as cores da barbearia ao painel inteiro
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data,
    staleTime: 5 * 60 * 1000,
  })
  useEffect(() => { if (settings) applyTenantTheme(settings) }, [settings, theme])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen bg-app overflow-hidden">
      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Scissors size={16} className="text-accentFg" />
            </div>
            <span className="font-bold text-content text-lg">BarberSaaS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted hover:text-content">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-accent/20 text-accent border border-accent/30'
                    : 'text-muted hover:bg-surfaceHover hover:text-content'
                }`}
                onClick={() => setSidebarOpen(false)}>
                <Icon size={18} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-accentFg font-bold text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content truncate">{user?.name}</p>
              <p className="text-xs text-subtle capitalize">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-muted hover:bg-red-900/30 hover:text-red-400 transition-all">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted hover:text-content p-2 rounded-lg hover:bg-surfaceHover">
            <Menu size={20} />
          </button>
          <div className="flex-1 lg:flex-none">
            <h1 className="text-sm font-medium text-muted">
              {nav.find(n => n.to === location.pathname)?.label ?? 'Painel'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              aria-label="Alternar tema"
              className="p-2 text-muted hover:text-content hover:bg-surfaceHover rounded-xl transition-all">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
