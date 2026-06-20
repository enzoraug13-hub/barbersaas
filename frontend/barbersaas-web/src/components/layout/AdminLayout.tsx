import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Calendar, Users, Scissors, DollarSign,
  Target, Package, Settings, LogOut, Menu, X, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
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

  // Aplica as cores da barbearia ao painel inteiro
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data.data,
    staleTime: 5 * 60 * 1000,
  })
  useEffect(() => { if (settings) applyTenantTheme(settings) }, [settings])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`ds-sidebar fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="ds-sidebar-logo flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="ds-sidebar-logo-mark w-8 h-8 rounded-lg flex items-center justify-center">
              <Scissors size={16} style={{ color: 'var(--bg-base)' }} />
            </div>
            <span className="ds-sidebar-logo-text">BarberSaaS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ds-icon-btn lg:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link key={to} to={to}
                className={`ds-nav-item ${active ? 'ds-nav-item-active' : ''}`}
                onClick={() => setSidebarOpen(false)}>
                <Icon size={18} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="ds-sidebar-footer px-3 py-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="ds-avatar w-8 h-8 rounded-full flex items-center justify-center text-sm">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="ds-user-name truncate">{user?.name}</p>
              <p className="ds-user-role">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="ds-logout-btn">
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="ds-topbar h-16 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="ds-icon-btn lg:hidden">
            <Menu size={20} />
          </button>
          <div className="flex-1 lg:flex-none">
            <h1 className="ds-topbar-title">
              {nav.find(n => n.to === location.pathname)?.label ?? 'Painel'}
            </h1>
          </div>
        </header>

        {/* Content — fade suave a cada troca de página */}
        <main key={location.pathname} className="ds-main-content flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
