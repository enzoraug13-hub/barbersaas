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
