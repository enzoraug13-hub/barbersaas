// Tons discretos e fixos por nome: a mesma pessoa tem sempre a mesma cor
// (ajuda a reconhecer o barbeiro na agenda) sem competir com a cor da marca.
const TINTS: [string, string][] = [
  ['#E9E4F4', '#55457F'],
  ['#E2ECF6', '#2C5A86'],
  ['#E3F0E8', '#2D6447'],
  ['#F5EADB', '#7E5520'],
  ['#F4E2E0', '#88392F'],
  ['#E2EDEE', '#386166'],
]

export function tintFor(name?: string | null): [string, string] {
  const s = (name ?? '').trim().toLowerCase()
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return TINTS[h % TINTS.length]
}

export function initials(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return (first + last).toUpperCase()
}
