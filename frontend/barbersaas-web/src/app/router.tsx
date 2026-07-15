import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage    from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ConfirmEmailPage from '../pages/auth/ConfirmEmailPage'
import BookingPage  from '../pages/public/BookingPage'
import ClientAccountPage from '../pages/client/ClientAccountPage'
import StyleGuidePage from '../pages/StyleGuidePage'
import AdminLayout  from '../components/layout/AdminLayout'
import DashboardPage from '../pages/admin/DashboardPage'
import AgendaPage   from '../pages/admin/AgendaPage'
import ClientsPage  from '../pages/admin/ClientsPage'
import BarbersPage  from '../pages/admin/BarbersPage'
import BarberProfilePage from '../pages/admin/BarberProfilePage'
import ServicesPage from '../pages/admin/ServicesPage'
import FinancialPage from '../pages/admin/FinancialPage'
import GoalsPage    from '../pages/admin/GoalsPage'
import ProductsPage from '../pages/admin/ProductsPage'
import ConfigPage   from '../pages/admin/ConfigPage'
import SuperAdminPage from '../pages/admin/SuperAdminPage'
import SuperAdminInvoicesPage from '../pages/admin/SuperAdminInvoicesPage'
import SuperAdminAnnouncementsPage from '../pages/admin/SuperAdminAnnouncementsPage'
import { useAuthStore } from '../store/authStore'
import { isSuperAdmin } from '../lib/roles'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  )
}

// Guarda de UI da rota /super-admin: usuário comum é mandado de volta pro painel.
// A guarda REAL é o backend (policy RequireSuperAdmin → 403) — isto aqui só evita
// mostrar uma tela que não funcionaria.
function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  return isSuperAdmin(user?.role) ? <>{children}</> : <Navigate to="/admin" replace />
}

// O dashboard da barbearia não é a casa do super admin (ele é dono do Trimly, não
// de uma barbearia): /admin manda ele pra /super-admin. Owner/Admin veem o Dashboard
// normal, exatamente como antes. As rotas de barbearia seguem existindo pra ele —
// só não são o destino padrão.
function AdminHome() {
  const user = useAuthStore(s => s.user)
  return isSuperAdmin(user?.role)
    ? <Navigate to="/super-admin" replace />
    : <AdminPage><DashboardPage /></AdminPage>
}

// Raiz: super admin logado cai direto na casa dele. Para todos os outros, o
// comportamento é o de sempre — vai pro login.
function RootRedirect() {
  const user = useAuthStore(s => s.user)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return isAuthenticated && isSuperAdmin(user?.role)
    ? <Navigate to="/super-admin" replace />
    : <Navigate to="/login" replace />
}

export const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/confirmar-email', element: <ConfirmEmailPage /> },
  { path: '/b/:slug',       element: <BookingPage /> },
  { path: '/b/:slug/conta', element: <ClientAccountPage /> },
  { path: '/style-guide',   element: <StyleGuidePage /> },

  { path: '/admin',              element: <AdminHome /> },
  { path: '/admin/agenda',       element: <AdminPage><AgendaPage /></AdminPage> },
  { path: '/admin/clientes',     element: <AdminPage><ClientsPage /></AdminPage> },
  { path: '/admin/barbeiros',    element: <AdminPage><BarbersPage /></AdminPage> },
  { path: '/admin/barbeiros/:id', element: <AdminPage><BarberProfilePage /></AdminPage> },
  { path: '/admin/servicos',     element: <AdminPage><ServicesPage /></AdminPage> },
  { path: '/admin/financeiro',   element: <AdminPage><FinancialPage /></AdminPage> },
  { path: '/admin/metas',        element: <AdminPage><GoalsPage /></AdminPage> },
  { path: '/admin/produtos',     element: <AdminPage><ProductsPage /></AdminPage> },
  { path: '/admin/config',       element: <AdminPage><ConfigPage /></AdminPage> },
  { path: '/super-admin',         element: <AdminPage><SuperAdminRoute><SuperAdminPage /></SuperAdminRoute></AdminPage> },
  { path: '/super-admin/faturas', element: <AdminPage><SuperAdminRoute><SuperAdminInvoicesPage /></SuperAdminRoute></AdminPage> },
  { path: '/super-admin/avisos',  element: <AdminPage><SuperAdminRoute><SuperAdminAnnouncementsPage /></SuperAdminRoute></AdminPage> },

  { path: '/', element: <RootRedirect /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
