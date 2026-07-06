import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  MARGIN, INK, LINE, hexToRgb, readableText, fmtBRL, drawHeader, sectionTitle,
  drawKpiCards, applyFooters, ensureSpace, monthLabel, loadImageDataUrl,
} from './reportKit'
import type { TenantSettings } from '../../features/settings/settingsApi'
import type { DashboardData, Barber } from '../../types'
import type { BarberPerformance, PaymentMethods } from '../../features/dashboard/dashboardApi'

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const commissionLabel = (b?: Barber) => {
  if (!b) return '—'
  const commission = b.commissionType === 0 ? `Comissão ${b.commissionValue}%` : `Fixo ${fmtBRL(b.commissionValue)}`
  return b.chairRentAmount != null
    ? `${commission} + Cadeira ${fmtBRL(b.chairRentAmount)}/${b.chairRentPeriod === 0 ? 'sem' : 'mês'}`
    : commission
}

export interface MonthlyReportInput {
  settings: TenantSettings
  periodStart: string // yyyy-MM-dd (mês selecionado na tela)
  dashboard: DashboardData
  barbers: BarberPerformance[]
  barberMeta: Barber[] // modelo de comissão (GET /barbers)
  payments?: PaymentMethods
}

export async function generateMonthlyReport(input: MonthlyReportInput): Promise<void> {
  const { settings, dashboard, barbers, barberMeta, payments } = input
  const brand = hexToRgb(settings.primaryColor)
  const monthDate = new Date(input.periodStart + 'T00:00:00')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const logo = await loadImageDataUrl(settings.logoUrl)

  let y = drawHeader(doc, {
    brand,
    businessName: settings.businessName,
    title: 'Relatório Mensal',
    subtitle: monthLabel(monthDate),
    logo,
  })

  // Resumo financeiro
  y = sectionTitle(doc, y, 'Resumo financeiro', brand)
  const margin = dashboard.totalRevenue > 0 ? (dashboard.netProfit / dashboard.totalRevenue) * 100 : 0
  y = drawKpiCards(doc, y, [
    { label: 'Receita', value: fmtBRL(dashboard.totalRevenue) },
    { label: 'Despesas', value: fmtBRL(dashboard.totalExpense) },
    { label: 'Lucro', value: fmtBRL(dashboard.netProfit), accent: true },
    { label: 'Margem', value: `${margin.toFixed(1)}%`, accent: true },
  ], brand)

  // Desempenho por barbeiro
  y = sectionTitle(doc, y, 'Desempenho por barbeiro', brand)
  const metaById = new Map(barberMeta.map(b => [b.id, b]))
  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Barbeiro', 'Faturamento', 'Atend.', 'Ticket médio', 'Comissão']],
    body: barbers.map(b => [
      b.name,
      fmtBRL(b.revenue),
      String(b.totalAppointments),
      fmtBRL(b.totalAppointments > 0 ? b.revenue / b.totalAppointments : 0),
      commissionLabel(metaById.get(b.id)),
    ]),
    styles: { font: 'helvetica', fontSize: 9, textColor: INK, lineColor: LINE, lineWidth: 0.5, cellPadding: 6 },
    headStyles: { fillColor: brand, textColor: readableText(brand), fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 251] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24

  // Formas de pagamento (só se houver dado no período)
  if (payments && payments.total > 0) {
    y = ensureSpace(doc, y, 110)
    y = sectionTitle(doc, y, 'Formas de pagamento', brand)
    y = drawKpiCards(doc, y, [
      { label: 'Dinheiro', value: fmtBRL(payments.cash) },
      { label: 'Pix', value: fmtBRL(payments.pix) },
      { label: 'Débito', value: fmtBRL(payments.debit) },
      { label: 'Crédito', value: fmtBRL(payments.credit) },
    ], brand)
  }

  // Agendamentos e ocupação
  y = ensureSpace(doc, y, 100)
  y = sectionTitle(doc, y, 'Agendamentos e ocupação', brand)
  const occ = barbers.length ? barbers.reduce((s, b) => s + b.occupancyRate, 0) / barbers.length : 0
  drawKpiCards(doc, y, [
    { label: 'Total de atendimentos', value: String(dashboard.totalAppointments) },
    { label: 'Concluídos', value: String(dashboard.completedCount) },
    { label: 'Taxa de ocupação', value: `${occ.toFixed(1)}%`, accent: true },
  ], brand)

  applyFooters(doc, brand)
  doc.save(`relatorio-mensal-${slug(settings.businessName)}-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}.pdf`)
}
