import {
  LayoutDashboard, Calendar, Users, Scissors, Tag, DollarSign, Target, Package, Settings,
  ShieldCheck, Receipt, Megaphone, LifeBuoy, MessagesSquare, Gift,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// Estrutura do menu do painel. Mesmos destinos e a mesma regra de visibilidade
// por papel de antes — só a organização visual (grupos) mudou:
// - super admin: só o grupo Trimly;
// - demais papéis: menu da barbearia; Fidelidade aparece só com o programa ligado
//   (owner/admin — o AdminLayout decide).

/** Ícones do menu: lucide, tamanho 20, traço 1.75. */
export const ICON = { size: 20, strokeWidth: 1.75 } as const

export type NavLeaf = { to: string; label: string; icon: LucideIcon }
export type NavGroup = { label: string; items: NavLeaf[] }

export const leaves = {
  dashboard:     { to: '/admin',            label: 'Dashboard',          icon: LayoutDashboard },
  agenda:        { to: '/admin/agenda',     label: 'Agenda',             icon: Calendar },
  clientes:      { to: '/admin/clientes',   label: 'Clientes',           icon: Users },
  barbeiros:     { to: '/admin/barbeiros',  label: 'Barbeiros',          icon: Scissors },
  servicos:      { to: '/admin/servicos',   label: 'Serviços & Preços',  icon: Tag },
  financeiro:    { to: '/admin/financeiro', label: 'Financeiro',         icon: DollarSign },
  metas:         { to: '/admin/metas',      label: 'Metas',              icon: Target },
  produtos:      { to: '/admin/produtos',   label: 'Produtos',           icon: Package },
  fidelidade:    { to: '/admin/fidelidade', label: 'Fidelidade',         icon: Gift },
  config:        { to: '/admin/config',     label: 'Configurações',      icon: Settings },
  suporte:       { to: '/admin/suporte',    label: 'Suporte',            icon: LifeBuoy },
  saContas:      { to: '/super-admin',           label: 'Contas',    icon: ShieldCheck },
  saFaturas:     { to: '/super-admin/faturas',   label: 'Faturas',   icon: Receipt },
  saAvisos:      { to: '/super-admin/avisos',    label: 'Avisos',    icon: Megaphone },
  saMensagens:   { to: '/super-admin/mensagens', label: 'Mensagens', icon: MessagesSquare },
} satisfies Record<string, NavLeaf>

/** Menu da barbearia. */
export function barbershopGroups(loyaltyOn: boolean): NavGroup[] {
  return [
    { label: 'Operação', items: [leaves.dashboard, leaves.agenda, leaves.clientes] },
    { label: 'Equipe',   items: [leaves.barbeiros, leaves.servicos] },
    { label: 'Negócio',  items: [leaves.financeiro, leaves.metas, leaves.produtos, ...(loyaltyOn ? [leaves.fidelidade] : [])] },
    { label: 'Sistema',  items: [leaves.config, leaves.suporte] },
  ]
}

/** Menu do super admin (dono do Trimly) — sem operação de barbearia. */
export const superAdminGroups: NavGroup[] = [
  { label: 'Trimly', items: [leaves.saContas, leaves.saFaturas, leaves.saAvisos, leaves.saMensagens] },
]

/** Itens fixos da bottom nav (mobile); o resto vai pro "Mais". */
export const mobilePrimary = {
  barbershop: [leaves.dashboard, leaves.agenda, leaves.clientes, leaves.financeiro],
  superAdmin: [leaves.saContas, leaves.saFaturas, leaves.saAvisos, leaves.saMensagens],
}

/** Todas as folhas — resolve o título da topbar. */
export const allLeaves: NavLeaf[] = Object.values(leaves)

// '/admin' e '/super-admin' casam só na rota exata (ou, no caso de /super-admin,
// também nas sub-rotas de conta); os demais casam também em sub-rotas
// (ex.: '/admin/barbeiros/:id' destaca "Barbeiros").
export const isActive = (to: string, pathname: string) =>
  to === '/admin' ? pathname === '/admin'
    : to === '/super-admin' ? pathname === '/super-admin' || pathname.startsWith('/super-admin/contas/')
    : pathname === to || pathname.startsWith(to + '/')

export const titleFor = (pathname: string) =>
  allLeaves
    .filter(l => isActive(l.to, pathname))
    .sort((a, b) => b.to.length - a.to.length)[0]?.label ?? 'Painel'
