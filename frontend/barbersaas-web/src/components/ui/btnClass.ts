export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

/** Classes de botão — também usadas em <Link>/<a> que precisam parecer botão. */
export function btnClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') {
  return [
    'ds-btn',
    `ds-btn-${variant}`,
    size !== 'md' ? `ds-btn-${size}` : '',
    extra,
  ].filter(Boolean).join(' ')
}
