import { useState, useRef } from 'react'
import { Paperclip, FileCheck2 } from 'lucide-react'
import { useAttachReceipt, type Invoice } from '../../features/superadmin/invoicesApi'
import { Button } from '../ui/Button'
import { uploadImage } from '../../lib/upload'
import { assetUrl } from '../../lib/api'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

/**
 * Anexar/ver comprovante de uma fatura (reusa o uploadImage de /uploads).
 * Usado na aba geral de Faturas e no detalhe da barbearia.
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
      toast.error(apiErrorMessage(err, 'Não foi possível anexar o comprovante.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={onFile} />
      {invoice.receiptUrl ? (
        <Button variant="ghost" size="sm" onClick={() => window.open(assetUrl(invoice.receiptUrl!), '_blank', 'noopener')}>
          <FileCheck2 size={14} /> Comprovante
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} loading={busy}>
          <Paperclip size={14} /> Anexar
        </Button>
      )}
    </>
  )
}
