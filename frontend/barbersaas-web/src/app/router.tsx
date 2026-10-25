import { createBrowserRouter, Navigate } from 'react-router-dom'
import LoginPage    from '../pages/auth/LoginPage'
// Auto-cadastro público DESATIVADO (contas criadas pelo super admin). O componente
// RegisterPage fica no código para a reativação futura com billing self-service:
// descomente o import e restaure a rota /register abaixo (e o link no LoginPage).
// import RegisterPage from '../pages/auth/RegisterPage'
import ConfirmEmailPage from '../pages/auth/ConfirmEmailPage'
import BookingPage  from '../pages/public/BookingPage'
import ClientAccountPage from '../pages/client/ClientAccountPage'
import { AdminPage, SuperAdminRoute, AdminHome, RootRedirect } from './RouteGuards'
import {
  StyleGuidePage, AgendaPage, ClientsPage, BarbersPage, BarberProfilePage, ServicesPage, FinancialPage, GoalsPage, ProductsPage, ConfigPage, LoyaltyPage, SuperAdminPage, SuperAdminInvoicesPage, SuperAdminAnnouncementsPage, SuperAdminSupportPage, SuperAdminTenantDetailPage, SupportPage,
} from './lazyPages'

export const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  // Cadastro público desligado: acesso direto a /register volta pro login em vez de
  // uma tela quebrada. Reativar = trocar por <RegisterPage /> (import comentado acima).
  { path: '/register', element: <Navigate to="/login" replace /> },
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
  { path: '/admin/fidelidade',   element: <AdminPage><LoyaltyPage /></AdminPage> },
  { path: '/admin/config',       element: <AdminPage><ConfigPage /></AdminPage> },
  { path: '/admin/suporte',      element: <AdminPage><SupportPage /></AdminPage> },
  { path: '/super-admin',         element: <AdminPage><SuperAdminRoute><SuperAdminPage /></SuperAdminRoute></AdminPage> },
  { path: '/super-admin/contas/:id', element: <AdminPage><SuperAdminRoute><SuperAdminTenantDetailPage /></SuperAdminRoute></AdminPage> },
  { path: '/super-admin/faturas', element: <AdminPage><SuperAdminRoute><SuperAdminInvoicesPage /></SuperAdminRoute></AdminPage> },
  { path: '/super-admin/avisos',  element: <AdminPage><SuperAdminRoute><SuperAdminAnnouncementsPage /></SuperAdminRoute></AdminPage> },
  { path: '/super-admin/mensagens', element: <AdminPage><SuperAdminRoute><SuperAdminSupportPage /></SuperAdminRoute></AdminPage> },

  { path: '/', element: <RootRedirect /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])
