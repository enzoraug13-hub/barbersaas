import { lazy } from 'react'
import { Navigate } from 'react-router-dom'
import AdminLayout from '../components/layout/AdminLayout'
import { useAuthStore } from '../store/authStore'
import { isSuperAdmin } from '../lib/roles'

const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  )
}

// Guarda de UI da rota /super-admin: usuário comum é mandado de volta pro painel.
// A guarda REAL é o backend (policy RequireSuperAdmin → 403) — isto aqui só evita
// mostrar uma tela que não funcionaria.
export function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return isSuperAdmin(user?.role) ? <>{children}</> : <Navigate to="/admin" replace />
}

// O dashboard da barbearia não é a casa do super admin (ele é dono do Trimly, não
// de uma barbearia): /admin manda ele pra /super-admin. Owner/Admin veem o Dashboard
// normal, exatamente como antes. As rotas de barbearia seguem existindo pra ele —
// só não são o destino padrão.
export function AdminHome() {
  const user = useAuthStore(s => s.user)
  return isSuperAdmin(user?.role)
    ? <Navigate to="/super-admin" replace />
    : <AdminPage><DashboardPage /></AdminPage>
}

// Raiz: super admin logado cai direto na casa dele. Para todos os outros, o
// comportamento é o de sempre — vai pro login.
export function RootRedirect() {
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated && isSuperAdmin(user?.role)
    ? <Navigate to="/super-admin" replace />
    : <Navigate to="/login" replace />
}
