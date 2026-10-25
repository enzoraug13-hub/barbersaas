// Só Brasil por ora. Para outro país: incluir aqui (código, máscara/validação
// próprias) e trocar o prefixo fixo do PhoneField por um seletor.
export const COUNTRIES = [
  { code: 'BR', dial: '+55', label: 'Brasil' },
] as const
