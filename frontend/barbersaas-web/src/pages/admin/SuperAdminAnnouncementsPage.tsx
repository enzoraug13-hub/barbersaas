import { useState } from 'react'
import { Megaphone, Send, Trash2, Globe, Store, CheckCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement,
  type Announcement,
} from '../../features/superadmin/announcementsApi'
import { useSuperAdminTenants } from '../../features/superadmin/superAdminApi'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'

const when = (iso: string) => format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })

/** 'all' = broadcast; qualquer outro valor é o id da barbearia alvo. */
const emptyForm = () => ({ title: '', body: '', target: 'all' })

export default function SuperAdminAnnouncementsPage() {
  const { data: announcements, isLoading } = useAnnouncements()
  const { data: tenants } = useSuperAdminTenants()
  const create = useCreateAnnouncement()
  const remove = useDeleteAnnouncement()

  const [form, setForm] = useState(emptyForm)

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { toast.error('Informe o título.'); return }
    if (!form.body.trim()) { toast.error('Escreva a mensagem.'); return }
    try {
      await create.mutateAsync({
        title: form.title.trim(),
        body: form.body.trim(),
        tenantId: form.target === 'all' ? null : form.target,
      })
      toast.success('Aviso publicado.')
      setForm(emptyForm())
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao publicar o aviso.')
    }
  }

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm(`Remover o aviso "${a.title}"? Ele some do painel de todas as barbearias.`)) return
    try {
      await remove.mutateAsync(a.id)
      toast.success('Aviso removido.')
    } catch (err: any) {
      toast.error(err?.response?.data?.errors?.[0] ?? 'Erro ao remover o aviso.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="ds-page-title flex items-center gap-2">
          <Megaphone size={24} style={{ color: 'var(--accent)' }} /> Avisos
        </h2>
        <p className="ds-page-sub">Comunicados do Trimly que aparecem no painel das barbearias.</p>
      </div>

      {/* Compor aviso */}
      <Card>
        <form onSubmit={handlePublish} className="space-y-4">
          <Input label="Título" value={form.title} maxLength={150}
            placeholder="Ex.: Atualização programada para amanhã"
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

          <div className="ds-field">
            <label className="ds-label">Mensagem</label>
            <textarea className="ds-input" rows={4} maxLength={2000} value={form.body}
              placeholder="Escreva o comunicado…"
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          </div>

          <div className="flex items-end justify-between flex-wrap gap-3">
            <div className="ds-field" style={{ minWidth: 260 }}>
              <label className="ds-label">Enviar para</label>
              <select className="ds-input" value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                <option value="all">Todas as barbearias</option>
                {tenants?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <Button type="submit" loading={create.isPending}>
              <Send size={16} /> {create.isPending ? 'Publicando…' : 'Publicar aviso'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Histórico */}
      <div>
        <h3 className="ds-section-title mb-3">Avisos publicados</h3>
        {isLoading ? (
          <Card><Skeleton className="h-32" /></Card>
        ) : !announcements?.length ? (
          <EmptyState icon={Megaphone} title="Nenhum aviso publicado"
            hint="O primeiro comunicado que você publicar aparece aqui." />
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="ds-text-primary font-medium">{a.title}</p>
                      {a.tenantId === null ? (
                        <Badge variant="accent"><Globe size={11} className="inline mr-1" />Todas</Badge>
                      ) : (
                        <Badge variant="info"><Store size={11} className="inline mr-1" />{a.tenantName ?? 'Barbearia'}</Badge>
                      )}
                    </div>
                    <p className="ds-text-secondary mt-1 whitespace-pre-wrap" style={{ fontSize: 'var(--text-sm)' }}>{a.body}</p>
                    <p className="ds-text-secondary mt-2 flex items-center gap-3" style={{ fontSize: 'var(--text-xs)' }}>
                      <span>{when(a.createdAt)}</span>
                      <span className="flex items-center gap-1">
                        <CheckCheck size={13} />
                        {a.readCount === 0 ? 'Ninguém leu ainda'
                          : a.readCount === 1 ? 'Lido por 1 barbearia'
                          : `Lido por ${a.readCount} barbearias`}
                      </span>
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => handleDelete(a)} disabled={remove.isPending}
                    style={{ fontSize: 'var(--text-xs)', height: 30, color: 'var(--color-error)' }}>
                    <Trash2 size={13} /> Remover
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
