import { lazy } from 'react'

// Painel e super admin em pedaços separados: quem abre só a página de agendamento
// (celular do cliente) não baixa gráficos, PDF e telas do painel.
export const StyleGuidePage = lazy(() => import('../pages/StyleGuidePage'))
export const AgendaPage = lazy(() => import('../pages/admin/AgendaPage'))
export const ClientsPage = lazy(() => import('../pages/admin/ClientsPage'))
export const BarbersPage = lazy(() => import('../pages/admin/BarbersPage'))
export const BarberProfilePage = lazy(() => import('../pages/admin/BarberProfilePage'))
export const ServicesPage = lazy(() => import('../pages/admin/ServicesPage'))
export const FinancialPage = lazy(() => import('../pages/admin/FinancialPage'))
export const GoalsPage = lazy(() => import('../pages/admin/GoalsPage'))
export const ProductsPage = lazy(() => import('../pages/admin/ProductsPage'))
export const ConfigPage = lazy(() => import('../pages/admin/ConfigPage'))
export const LoyaltyPage = lazy(() => import('../pages/admin/LoyaltyPage'))
export const SuperAdminPage = lazy(() => import('../pages/admin/SuperAdminPage'))
export const SuperAdminInvoicesPage = lazy(() => import('../pages/admin/SuperAdminInvoicesPage'))
export const SuperAdminAnnouncementsPage = lazy(() => import('../pages/admin/SuperAdminAnnouncementsPage'))
export const SuperAdminSupportPage = lazy(() => import('../pages/admin/SuperAdminSupportPage'))
export const SuperAdminTenantDetailPage = lazy(() => import('../pages/admin/SuperAdminTenantDetailPage'))
export const SupportPage = lazy(() => import('../pages/admin/SupportPage'))
