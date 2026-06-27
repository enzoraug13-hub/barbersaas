import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  MARGIN, CONTENT_W, INK, MUTED, LINE, hexToRgb, readableText, fmtBRL, drawHeader,
  sectionTitle, drawKpiCards, applyFooters, ensureSpace, monthLabel, loadImageDataUrl,
} from './reportKit'
import type { TenantSettings } from '../../features/settings/settingsApi'
import type { Barber } from '../../types'
import type { BarberPerformance } from '../../features/dashboard/dashboardApi'
import type { BarberServiceItem } from '../../features/barbers/barbersApi'

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export interface BarberReportInput {
  settings: TenantSettings
  periodStart: string // yyyy-MM-dd (mês corrente da página)
  barber: Barber
  perf?: BarberPerformance | null // KPIs do mês (faturamento, atend., ocupação)
  services: BarberServiceItem[]
  chart?: { dataUrl: string; w: number; h: number } | null // gráfico 6 meses (2x)
}

export async function generateBarberReport(input: BarberReportInput): Promise<void> {
  const { settings, barber, perf, services } = input
  const brand = hexToRgb(settings.primaryColor)
  const monthDate = new Date(input.periodStart + 'T00:00:00')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const [logo, avatar] = await Promise.all([
    loadImageDataUrl(settings.logoUrl),
    loadImageDataUrl(barber.photoUrl),
  ])

  let y = drawHeader(doc, {
    brand,
    businessName: settings.businessName,
    title: 'Relatório do Profissional',
    subtitle: monthLabel(monthDate),
    logo,
    avatar,
    avatarInitial: barber.name.charAt(0).toUpperCase(),
    avatarName: barber.name,
  })

  // KPIs do barbeiro no mês
  const revenue = perf?.revenue ?? 0
  const appts = perf?.totalAppointments ?? 0
  const ticket = appts > 0 ? revenue / appts : 0
  const occupancy = perf?.occupancyRate ?? 0
  y = sectionTitle(doc, y, 'Resumo do mês', brand)
  y = drawKpiCards(doc, y, [
    { label: 'Faturamento', value: fmtBRL(revenue), accent: true },
    { label: 'Atendimentos', value: String(appts) },
    { label: 'Ticket médio', value: fmtBRL(ticket) },
    { label: 'Ocupação', value: `${occupancy.toFixed(1)}%`, accent: true },
  ], brand)

  // Gráfico de desempenho (últimos 6 meses) — imagem 2x
  if (input.chart && input.chart.w > 0) {
    y = sectionTitle(doc, y, 'Desempenho — últimos 6 meses', brand)
    const h = Math.min(220, CONTENT_W * (input.chart.h / input.chart.w))
    y = ensureSpace(doc, y, h + 12)
    doc.addImage(input.chart.dataUrl, 'PNG', MARGIN, y, CONTENT_W, h)
    y += h + 24
  }

  // Serviços e preços dele
  const offered = services.filter(s => s.isOffered)
  if (offered.length) {
    y = ensureSpace(doc, y, 90)
    y = sectionTitle(doc, y, 'Serviços e preços', brand)
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Serviço', 'Preço']],
      body: offered.map(s => [s.serviceName, fmtBRL(s.effectivePrice)]),
      styles: { font: 'helvetica', fontSize: 9, textColor: INK, lineColor: LINE, lineWidth: 0.5, cellPadding: 6 },
      headStyles: { fillColor: brand, textColor: readableText(brand), fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 251] },
      columnStyles: { 1: { halign: 'right' } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
  }

  // Remuneração
  y = ensureSpace(doc, y, 110)
  y = sectionTitle(doc, y, 'Remuneração', brand)
  const isPct = barber.commissionType === 0
  const model = isPct
    ? `Comissão de ${barber.commissionValue}% sobre o faturamento`
    : `Valor fixo de ${fmtBRL(barber.commissionValue)} por atendimento`
  const earns = isPct ? revenue * (barber.commissionValue / 100) : barber.commissionValue * appts
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...MUTED)
  doc.text('Modelo de remuneração', MARGIN, y + 4)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...INK)
  doc.text(model, MARGIN, y + 20)
  drawKpiCards(doc, y + 32, [
    { label: 'Recebe no mês (estimado)', value: fmtBRL(earns), accent: true },
  ], brand)

  applyFooters(doc, brand)
  doc.save(`relatorio-${slug(barber.name)}-${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}.pdf`)
}
