import { useState, useRef } from 'react'
import { Paperclip, ExternalLink, Loader2 } from 'lucide-react'
import { useAttachReceipt, type Invoice } from '../../features/superadmin/invoicesApi'
import { Button } from '../ui/Button'
import { uploadImage } from '../ui/ImageField'
import { assetUrl } from '../../lib/api'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

/**
 * Anexar/ver comprovante de uma fatura (reusa o uploadImage de /uploads).
 * Compartilhado entre a aba geral de Faturas e a página de detalhe da barbearia.
 */
export function InvoiceReceiptButton({ invoice }: { invoice: Invoice }) {
  const attach = useAttachReceipt()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const url = await uploadImage(file)
      await attach.mutateAsync({ id: invoice.id, receiptUrl: url })
      toast.success('Comprovante anexado.')
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Erro ao anexar o comprovante.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
      {invoice.receiptUrl ? (
        <Button variant="ghost" onClick={() => window.open(assetUrl(invoice.receiptUrl!), '_blank', 'noopener')}
          style={{ fontSize: 'var(--text-xs)', height: 30 }}>
          <ExternalLink size={13} /> Comprovante
        </Button>
      ) : (
        <Button variant="ghost" onClick={() => inputRef.current?.click()} disabled={busy}
          style={{ fontSize: 'var(--text-xs)', height: 30 }}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Paperclip size={13} />} Anexar
        </Button>
      )}
    </>
  )
}
