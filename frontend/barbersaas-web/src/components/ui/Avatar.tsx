import { assetUrl } from '../../lib/api'
import { tintFor, initials } from '../../lib/avatar'

export function Avatar({ name, src, size = 36, className = '' }: {
  name?: string | null; src?: string | null; size?: number; className?: string
}) {
  const [bg, fg] = tintFor(name)
  const url = src ? assetUrl(src) : undefined
  return (
    <span className={`ds-avatar ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), background: url ? undefined : bg, color: fg }}
      aria-hidden="true">
      {url ? <img src={url} alt="" /> : initials(name)}
    </span>
  )
}
