import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage    from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import BookingPage  from '../pages/public/BookingPage'
import ClientAccountPage from '../pages/client/ClientAccountPage'
import StyleGuidePage from '../pages/StyleGuidePage'
import AdminLayout  from '../components/layout/AdminLayout'
import DashboardPage from '../pages/admin/DashboardPage'
import AgendaPage   from '../pages/admin/AgendaPage'
import ClientsPage  from '../pages/admin/ClientsPage'
import BarbersPage  from '../pages/admin/BarbersPage'
import ServicesPage from '../pages/admin/ServicesPage'
import FinancialPage from '../pages/admin/FinancialPage'
import GoalsPage    from '../pages/admin/GoalsPage'
import ProductsPage from '../pages/admin/ProductsPage'
import ConfigPage   from '../pages/admin/ConfigPage'
import { useAuthStore } from '../store/authStore'

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

export const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/b/:slug',       element: <BookingPage /> },
  { path: '/b/:slug/conta', element: <ClientAccountPage /> },
  { path: '/style-guide',   element: <StyleGuidePage /> },

  { path: '/admin',              element: <AdminPage><DashboardPage /></AdminPage> },
  { path: '/admin/agenda',       element: <AdminPage><AgendaPage /></AdminPage> },
  { path: '/admin/clientes',     element: <AdminPage><ClientsPage /></AdminPage> },
  { path: '/admin/barbeiros',    element: <AdminPage><BarbersPage /></AdminPage> },
  { path: '/admin/servicos',     element: <AdminPage><ServicesPage /></AdminPage> },
  { path: '/admin/financeiro',   element: <AdminPage><FinancialPage /></AdminPage> },
  { path: '/admin/metas',        element: <AdminPage><GoalsPage /></AdminPage> },
  { path: '/admin/produtos',     element: <AdminPage><ProductsPage /></AdminPage> },
  { path: '/admin/config',       element: <AdminPage><ConfigPage /></AdminPage> },

  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
