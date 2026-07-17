import { useState, useRef } from 'react'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { api, assetUrl } from '../../lib/api'
import { Button } from './Button'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

// Sobe a imagem para /uploads e devolve a URL pública.
export async function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await api.post('/uploads', fd, { headers: { 'Content-Type': undefined } })
  return res.data.data.url as string
}

/* ---------- Campo de upload de imagem (preview + trocar + remover) ---------- */
export function ImageField({ label, hint, value, onChange, tall }: {
  label: string; hint?: string; value?: string; onChange: (url: string) => void; tall?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const pick = () => inputRef.current?.click()
  const send = async (file: File) => {
    setBusy(true)
    try { onChange(await uploadImage(file)); toast.success('Imagem enviada — clique em Salvar para aplicar.') }
    catch (err) { toast.error(apiErrorMessage(err, 'Erro ao enviar imagem.')) }
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
  const dragHandlers = {
    onDragOver: (e: React.DragEvent<HTMLElement>) => { e.preventDefault(); setDragOver(true) },
    onDragLeave: () => setDragOver(false),
    onDrop,
  }

  const boxStyle: React.CSSProperties = { width: '100%', height: tall ? 144 : 112, borderRadius: 'var(--radius-md)' }

  return (
    <div className="ds-field">
      {label && <label className="ds-label">{label}</label>}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
      {value ? (
        <div className="relative group" {...dragHandlers}>
          <img src={assetUrl(value)} alt={label} style={{ ...boxStyle, objectFit: 'cover', border: `1px solid ${dragOver ? 'var(--accent)' : 'var(--border-default)'}`, background: 'var(--bg-elevated)' }} />
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-md)' }}>
            <Button type="button" variant="ghost" onClick={pick} loading={busy} style={{ fontSize: 'var(--text-xs)', height: 32, padding: '0 var(--space-3)' }}>{!busy && <Upload size={13} />} Trocar</Button>
            <Button type="button" variant="danger" onClick={() => onChange('')} style={{ fontSize: 'var(--text-xs)', height: 32, padding: '0 var(--space-3)' }}><X size={13} /> Remover</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={pick} disabled={busy} {...dragHandlers}
          className="w-full flex flex-col items-center justify-center gap-1 transition-colors"
          style={{ ...boxStyle, border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border-default)'}`, background: dragOver ? 'var(--accent-soft)' : 'none', color: 'var(--text-disabled)', cursor: 'pointer' }}>
          {busy ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent)' }} /> : <ImageIcon size={22} />}
          <span style={{ fontSize: 'var(--text-xs)' }}>{busy ? 'Enviando…' : dragOver ? 'Solte a imagem aqui' : 'Clique ou arraste a imagem aqui'}</span>
        </button>
      )}
      {hint && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>{hint}</p>}
    </div>
  )
}
