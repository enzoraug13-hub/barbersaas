import { useState } from 'react'
import { Megaphone, CheckCheck } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement, type Announcement,
} from '../../features/superadmin/announcementsApi'
import { useSuperAdminTenants } from '../../features/superadmin/superAdminApi'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input, Select, Textarea } from '../../components/ui/Input'
import { Pill } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { apiErrorMessage } from '../../lib/apiError'

const when = (iso: string) => format(parseISO(iso), "d 'de' MMM 'às' HH:mm", { locale: ptBR })

/** 'all' = todas as barbearias; qualquer outro valor é o id da barbearia alvo. */
const emptyForm = () => ({ title: '', body: '', target: 'all' })

export default function SuperAdminAnnouncementsPage() {
  const { data: announcements, isLoading } = useAnnouncements()
  const { data: tenants } = useSuperAdminTenants()
  const create = useCreateAnnouncement()
  const remove = useDeleteAnnouncement()

  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})
  const [toDelete, setToDelete] = useState<Announcement | null>(null)

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!form.title.trim()) next.title = 'Dê um título ao aviso.'
    if (!form.body.trim()) next.body = 'Escreva a mensagem.'
    setErrors(next)
    if (next.title || next.body) return
    try {
      await create.mutateAsync({
        title: form.title.trim(),
        body: form.body.trim(),
        tenantId: form.target === 'all' ? null : form.target,
      })
      toast.success('Aviso publicado.')
      setForm(emptyForm())
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível publicar o aviso.'))
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      await remove.mutateAsync(toDelete.id)
      toast.success('Aviso removido.')
      setToDelete(null)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Não foi possível remover o aviso.'))
    }
  }

  const targetName = form.target === 'all' ? 'todas as barbearias' : tenants?.find(t => t.id === form.target)?.name

  return (
    <div className="space-y-5">
      <PageHeader title="Avisos" subtitle="Comunicados do Trimly que aparecem no sino do painel das barbearias." />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6 items-start">
        <Panel title="Novo aviso" className="xl:sticky xl:top-6">
          <form onSubmit={handlePublish} className="space-y-4">
            <Input label="Título" value={form.title} maxLength={150} error={errors.title}
              placeholder="Ex.: Manutenção programada no domingo"
              onChange={e => { setForm(f => ({ ...f, title: e.target.value })); if (errors.title) setErrors(er => ({ ...er, title: undefined })) }} />
            <Textarea label="Mensagem" rows={5} maxLength={2000} value={form.body} error={errors.body}
              hint={`${form.body.length}/2000`}
              onChange={e => { setForm(f => ({ ...f, body: e.target.value })); if (errors.body) setErrors(er => ({ ...er, body: undefined })) }} />
            <Select label="Enviar para" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
              <option value="all">Todas as barbearias</option>
              {[...(tenants ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Button type="submit" block loading={create.isPending}>
              {targetName ? `Publicar para ${targetName}` : 'Publicar aviso'}
            </Button>
          </form>
        </Panel>

        <Panel pad={false} split title="Publicados" description={announcements?.length ? `${announcements.length} ${announcements.length === 1 ? 'aviso' : 'avisos'}` : undefined}>
          {isLoading ? <ListSkeleton rows={3} boxed={false} /> : !announcements?.length ? (
            <EmptyState icon={Megaphone} title="Nenhum aviso publicado"
              hint="Use avisos para contar novidades, manutenções e mudanças de preço." />
          ) : (
            <ul>
              {announcements.map(a => (
                <li key={a.id} className="px-5 py-4 max-lg:px-4 border-b border-line last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{a.title}</p>
                      <div className="mt-1">
                        {a.tenantId === null
                          ? <Pill tone="accent">Todas as barbearias</Pill>
                          : <Pill tone="neutral">{a.tenantName ?? 'Barbearia'}</Pill>}
                      </div>
                    </div>
                    <Button variant="danger-ghost" size="sm" onClick={() => setToDelete(a)}>Remover</Button>
                  </div>
                  <p className="text-sm text-ink-2 mt-2 whitespace-pre-wrap">{a.body}</p>
                  <p className="text-13 text-ink-3 mt-2 flex items-center gap-1.5 flex-wrap">
                    <span>{when(a.createdAt)}.</span>
                    <span className="inline-flex items-center gap-1">
                      <CheckCheck size={14} />
                      {a.readCount === 0 ? 'Ninguém leu ainda'
                        : a.tenantId !== null ? 'Lido'
                        : a.readCount === 1 ? 'Lido por 1 barbearia' : `Lido por ${a.readCount} barbearias`}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Modal isOpen={!!toDelete} onClose={() => setToDelete(null)} title="Remover aviso" subtitle={toDelete?.title}
        footer={<>
          <Button variant="secondary" onClick={() => setToDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} loading={remove.isPending}>Remover aviso</Button>
        </>}>
        <p className="text-sm text-ink-2">O aviso some do painel de {toDelete?.tenantId === null ? 'todas as barbearias' : (toDelete?.tenantName ?? 'da barbearia')}.</p>
      </Modal>
    </div>
  )
}
