import { useState, useRef } from 'react'
import { ImageUp, Loader2 } from 'lucide-react'
import { assetUrl } from '../../lib/api'
import { uploadImage } from '../../lib/upload'
import { Button } from './Button'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

/* ---------- Campo de imagem: prévia + trocar + remover (arrastar e soltar) ---------- */
export function ImageField({ label, hint, value, onChange, tall, round }: {
  label: string; hint?: string; value?: string; onChange: (url: string) => void; tall?: boolean; round?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const pick = () => inputRef.current?.click()
  const send = async (file: File) => {
    setBusy(true)
    try { onChange(await uploadImage(file)); toast.success('Imagem enviada. Salve para aplicar.') }
    catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível enviar a imagem.')) }
    finally { setBusy(false) }
  }
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) await send(file)
  }
  const onDrop = async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) await send(file)
  }
  const drag = {
    onDragOver: (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); setDragOver(true) },
    onDragLeave: () => setDragOver(false),
    onDrop,
  }

  const h = tall ? 148 : 112

  return (
    <div className="ds-field">
      <span className="ds-label">{label}</span>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
      {value ? (
        <div className="flex items-center gap-3" {...drag}>
          <img src={assetUrl(value)} alt={label}
            className="object-cover flex-shrink-0 border border-line bg-surface-2"
            style={{ width: round ? 72 : tall ? 168 : 96, height: round ? 72 : tall ? 96 : 96, borderRadius: round ? '50%' : 8 }} />
          <div className="flex flex-col gap-2">
            <Button variant="secondary" size="sm" onClick={pick} loading={busy}>Trocar imagem</Button>
            <Button variant="danger-ghost" size="sm" onClick={() => onChange('')}>Remover</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={pick} disabled={busy} {...drag}
          className="w-full flex flex-col items-center justify-center gap-1.5 rounded-control text-13 text-ink-2 transition-colors"
          style={{
            height: h,
            border: `1px dashed ${dragOver ? 'var(--accent-ink)' : 'var(--line-strong)'}`,
            background: dragOver ? 'var(--accent-soft)' : 'var(--surface-2)',
          }}>
          {busy ? <Loader2 size={20} className="animate-spin" /> : <ImageUp size={20} strokeWidth={1.75} />}
          <span>{busy ? 'Enviando…' : dragOver ? 'Solte a imagem aqui' : 'Escolher imagem'}</span>
          {!busy && !dragOver && <span className="text-xs text-ink-3">ou arraste o arquivo para cá</span>}
        </button>
      )}
      {hint && <p className="ds-hint">{hint}</p>}
    </div>
  )
}
