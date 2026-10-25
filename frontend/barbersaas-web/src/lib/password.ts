// Sem caracteres que se confundem ao ditar ou ler no celular (0/O, 1/l/I).
const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ'
const DIGITS = '23456789'
const ALPHABET = LETTERS + DIGITS

/** Senha provisória legível (10 caracteres, aleatória, com pelo menos um número). */
export function generatePassword(length = 10): string {
  const bytes = new Uint32Array(length + 1)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  if (/\d/.test(out)) return out
  return out.slice(0, -1) + DIGITS[bytes[length] % DIGITS.length]
}

/** Texto pronto para mandar ao dono da barbearia (WhatsApp ou e-mail). */
export function accessMessage({ businessName, email, password, slug }: {
  businessName?: string; email?: string | null; password: string; slug?: string
}) {
  const origin = window.location.origin
  const lines = [
    businessName ? `Acesso da ${businessName} ao Trimly` : 'Seu acesso ao Trimly',
    '',
    `Entrar: ${origin}/login`,
  ]
  if (email) lines.push(`E-mail: ${email}`)
  lines.push(`Senha: ${password}`)
  if (slug) lines.push('', `Página de agendamento dos clientes: ${origin}/b/${slug}`)
  return lines.join('\n')
}
