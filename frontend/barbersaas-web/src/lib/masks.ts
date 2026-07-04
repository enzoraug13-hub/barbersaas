export const onlyDigits = (value: string): string => value.replace(/\D/g, '')

/** Aplica (XX) XXXXX-XXXX (ou XXXX-XXXX p/ fixo) progressivamente enquanto digita. */
export function maskBRPhone(digits: string): string {
  const d = onlyDigits(digits).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** Aplica XXX.XXX.XXX-XX progressivamente enquanto digita. */
export function maskCPF(digits: string): string {
  const d = onlyDigits(digits).slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Telefone BR válido: DDD (2) + número (8 fixo ou 9 celular) = 10 ou 11 dígitos. */
export function isValidBRPhone(digits: string): boolean {
  const d = onlyDigits(digits)
  return d.length === 10 || d.length === 11
}

/** Dígitos BR (DDD+número) -> formato internacional salvo no backend (+55DDDNUMERO). */
export function toE164BR(digits: string): string {
  const d = onlyDigits(digits)
  return d ? `+55${d}` : ''
}

/**
 * Extrai os dígitos BR (DDD+número) de um valor salvo em qualquer formato antigo:
 * "+5511999999999", "5511999999999", "(11) 99999-9999", "11999999999".
 */
export function brDigitsFromStored(stored?: string | null): string {
  if (!stored) return ''
  const d = onlyDigits(stored)
  if (stored.trim().startsWith('+55')) return d.slice(2)
  if (d.length >= 12 && d.startsWith('55')) return d.slice(2)
  return d
}

/**
 * Formata um telefone salvo para exibição: "(11) 99999-9999".
 * Valores que não parecem número BR (ex.: +1...) voltam como estão — nunca quebra.
 */
export function formatPhoneBR(stored?: string | null): string {
  if (!stored) return ''
  if (stored.trim().startsWith('+') && !stored.trim().startsWith('+55')) return stored
  const d = brDigitsFromStored(stored)
  if (d.length === 10 || d.length === 11) return maskBRPhone(d)
  return stored
}

/** Aplica XX.XXX.XXX/XXXX-XX progressivamente enquanto digita. */
export function maskCNPJ(digits: string): string {
  const d = onlyDigits(digits).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

/** CNPJ válido: 14 dígitos, não repetidos, com dígitos verificadores corretos. */
export function isValidCNPJ(digits: string): boolean {
  const d = onlyDigits(digits)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false

  const calcDigit = (length: number): number => {
    let weight = length - 7
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += parseInt(d[i], 10) * weight
      weight = weight === 2 ? 9 : weight - 1
    }
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }

  return calcDigit(12) === parseInt(d[12], 10) && calcDigit(13) === parseInt(d[13], 10)
}

/** CPF válido: 11 dígitos, não repetidos, com dígitos verificadores corretos. */
export function isValidCPF(digits: string): boolean {
  const d = onlyDigits(digits)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false

  const calcDigit = (length: number): number => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += parseInt(d[i], 10) * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return calcDigit(9) === parseInt(d[9], 10) && calcDigit(10) === parseInt(d[10], 10)
}
