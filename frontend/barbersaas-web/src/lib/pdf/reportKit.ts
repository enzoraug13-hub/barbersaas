import type jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Página A4 retrato em pontos (unit: 'pt').
export const A4 = { w: 595.28, h: 841.89 }
export const MARGIN = 40
export const CONTENT_W = A4.w - MARGIN * 2

// Tema CLARO fixo (fundo branco, texto escuro) — independente do tema do app.
export const INK: RGB = [28, 28, 30]        // texto principal
export const MUTED: RGB = [120, 120, 128]   // texto secundário
export const LINE: RGB = [226, 226, 230]    // divisórias
export const CARD_BG: RGB = [246, 246, 248] // fundo dos cards

export type RGB = [number, number, number]

export function hexToRgb(hex?: string): RGB {
  if (!hex) return INK
  let h = hex.trim().replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return INK
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function luminance([r, g, b]: RGB) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

// Cor de texto legível sobre um fundo — branco em fundos escuros, escuro em claros.
// Garante que a cor da marca funcione mesmo se for clara (requisito do tenant).
export function readableText(bg: RGB): RGB {
  return luminance(bg) > 0.6 ? [26, 26, 26] : [255, 255, 255]
}

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export { fmtBRL }

// Carrega uma imagem (logo/foto) como dataURL via fetch — evita "tainted canvas"
// e funciona com origem relativa (dev) ou absoluta (blob em prod). Best-effort:
// devolve null em qualquer falha (logo ausente, 404, CORS) e o relatório segue sem ela.
export async function loadImageDataUrl(url?: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { credentials: 'omit' })
    if (!res.ok) return null
    const blob = await res.blob()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = reject
      fr.readAsDataURL(blob)
    })
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image()
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
      img.onerror = () => resolve({ w: 0, h: 0 })
      img.src = dataUrl
    })
    return { dataUrl, ...dims }
  } catch { return null }
}

// Rasteriza um nó do DOM (o gráfico recharts) em escala 2x para o PDF ficar nítido.
export async function captureNode(node: HTMLElement): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff', logging: false, useCORS: true })
    return { dataUrl: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height }
  } catch { return null }
}

export interface HeaderOpts {
  brand: RGB
  businessName: string
  title: string
  subtitle: string
  logo?: { dataUrl: string; w: number; h: number } | null
  // PDF do barbeiro: foto + inicial de fallback
  avatar?: { dataUrl: string; w: number; h: number } | null
  avatarInitial?: string
  avatarName?: string
}

// Desenha o cabeçalho e devolve o y do cursor logo abaixo dele.
export function drawHeader(doc: jsPDF, o: HeaderOpts): number {
  // faixa fina na cor da marca no topo
  doc.setFillColor(...o.brand)
  doc.rect(0, 0, A4.w, 6, 'F')

  let x = MARGIN
  const top = 34
  // logo da barbearia (se houver), proporção preservada, caixa 46x46
  if (o.logo && o.logo.w > 0) {
    const box = 46
    const ratio = o.logo.w / o.logo.h
    const w = ratio >= 1 ? box : box * ratio
    const h = ratio >= 1 ? box / ratio : box
    doc.addImage(o.logo.dataUrl, 'PNG', x, top, w, h)
    x += box + 14
  }

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(o.businessName, x, top + 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(...o.brand)
  doc.text(o.title, x, top + 32)

  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(o.subtitle, x, top + 46)

  let y = top + 64

  // bloco do barbeiro (avatar + nome) no PDF individual
  if (o.avatarName) {
    const av = 40
    if (o.avatar && o.avatar.w > 0) {
      doc.addImage(o.avatar.dataUrl, 'PNG', MARGIN, y, av, av)
    } else {
      doc.setFillColor(...o.brand)
      doc.circle(MARGIN + av / 2, y + av / 2, av / 2, 'F')
      doc.setTextColor(...readableText(o.brand))
      doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
      doc.text(o.avatarInitial ?? '?', MARGIN + av / 2, y + av / 2 + 6, { align: 'center' })
    }
    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15)
    doc.text(o.avatarName, MARGIN + av + 12, y + 18)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED)
    doc.text('Profissional', MARGIN + av + 12, y + 32)
    y += av + 12
  }

  // divisória
  doc.setDrawColor(...LINE); doc.setLineWidth(1)
  doc.line(MARGIN, y, A4.w - MARGIN, y)
  return y + 22
}

// Título de seção com marcador na cor da marca. Devolve o y abaixo.
export function sectionTitle(doc: jsPDF, y: number, text: string, brand: RGB): number {
  doc.setFillColor(...brand)
  doc.rect(MARGIN, y - 8, 3, 12, 'F')
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
  doc.text(text.toUpperCase(), MARGIN + 9, y + 2)
  return y + 18
}

export interface KpiCard { label: string; value: string; accent?: boolean }

// Linha de cards de KPI. Devolve o y abaixo.
export function drawKpiCards(doc: jsPDF, y: number, cards: KpiCard[], brand: RGB): number {
  const gap = 10
  const w = (CONTENT_W - gap * (cards.length - 1)) / cards.length
  const h = 56
  cards.forEach((c, i) => {
    const x = MARGIN + i * (w + gap)
    doc.setFillColor(...CARD_BG)
    doc.roundedRect(x, y, w, h, 6, 6, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED)
    doc.text(c.label.toUpperCase(), x + 10, y + 18)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.setTextColor(...(c.accent ? brand : INK))
    doc.text(c.value, x + 10, y + 40)
  })
  return y + h + 18
}

// Rodapé "Gerado por Trimly" + data + paginação, aplicado em TODAS as páginas no fim.
export function applyFooters(doc: jsPDF, brand: RGB) {
  const n = doc.getNumberOfPages()
  const when = format(new Date(), "dd/MM/yyyy 'às' HH:mm")
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    const fy = A4.h - 28
    doc.setDrawColor(...LINE); doc.setLineWidth(1)
    doc.line(MARGIN, fy, A4.w - MARGIN, fy)
    // marcador na cor da marca + assinatura
    doc.setFillColor(...brand)
    doc.rect(MARGIN, fy + 7, 5, 5, 'F')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED)
    doc.text(`Gerado por Trimly · ${when}`, MARGIN + 10, fy + 14)
    if (n > 1) doc.text(`Página ${i}/${n}`, A4.w - MARGIN, fy + 14, { align: 'right' })
  }
}

// Garante que ainda cabe `need` pts na página; senão cria uma nova. Devolve o y.
export function ensureSpace(doc: jsPDF, y: number, need: number): number {
  if (y + need > A4.h - 50) { doc.addPage(); return MARGIN + 10 }
  return y
}

export const monthLabel = (d: Date) =>
  format(d, "MMMM 'de' yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())
