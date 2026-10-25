import { useState } from 'react'
import { Plus, Trash2, Package, AlertTriangle, Pencil, ArrowDownUp, Tag } from 'lucide-react'
import { PageHeader, Panel } from '../../components/ui/Panel'
import { Button } from '../../components/ui/Button'
import { Input, Select, Field } from '../../components/ui/Input'
import { Tabs } from '../../components/ui/Controls'
import { Pill } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { NumberField } from '../../components/ui/NumberField'
import {
  useProducts, useProductCategories, useCreateProduct,
  useUpdateProduct, useDeleteProduct, useAdjustStock, useCreateCategory,
} from '../../features/products/productsApi'
import { useIsDesktop } from '../../lib/useMediaQuery'
import { brl, num } from '../../lib/format'
import type { Product } from '../../types'
import toast from 'react-hot-toast'
import { apiErrorMessage } from '../../lib/apiError'

const EMPTY_FORM = { name: '', description: '', salePrice: 0, costPrice: 0, initialStock: 0, minStockAlert: 5, sku: '', categoryId: '' }

const margin = (p: Pick<Product, 'salePrice' | 'costPrice'>) =>
  p.salePrice > 0 && p.costPrice > 0 ? Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100) : null

export default function ProductsPage() {
  const desktop = useIsDesktop()
  const { data: products, isLoading } = useProducts()
  const { data: categories } = useProductCategories()
  const createProduct  = useCreateProduct()
  const updateProduct  = useUpdateProduct()
  const deleteProduct  = useDeleteProduct()
  const adjustStock    = useAdjustStock()
  const createCategory = useCreateCategory()

  const [tab, setTab]               = useState<'products' | 'categories'>('products')
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState<Product | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null)
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [stockQty, setStockQty]     = useState('')
  const [stockReason, setStockReason] = useState('')
  const [stockDir, setStockDir]     = useState<'entry' | 'exit'>('entry')
  const [form, setForm]             = useState(EMPTY_FORM)

  const set = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setNum = (k: 'salePrice' | 'costPrice' | 'initialStock' | 'minStockAlert') => (v: number) => setForm(f => ({ ...f, [k]: v }))

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit   = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', salePrice: p.salePrice, costPrice: p.costPrice, initialStock: 0, minStockAlert: p.minStockAlert, sku: p.sku ?? '', categoryId: p.categoryId })
    setShowForm(true)
  }
  const openStock = (p: Product) => { setStockProduct(p); setStockDir('entry'); setStockQty(''); setStockReason('') }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, name: form.name, description: form.description || undefined, salePrice: form.salePrice, costPrice: form.costPrice, minStockAlert: form.minStockAlert, sku: form.sku || undefined, categoryId: form.categoryId })
        toast.success('Produto atualizado.')
      } else {
        await createProduct.mutateAsync({ ...form, description: form.description || undefined, sku: form.sku || undefined })
        toast.success('Produto cadastrado.')
      }
      setShowForm(false)
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível salvar o produto.')) }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteProduct.mutateAsync(confirmDelete.id)
      toast.success('Produto excluído.')
      setConfirmDelete(null); setShowForm(false)
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível excluir.')) }
  }

  const handleStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockProduct) return
    const qty = stockDir === 'entry' ? +stockQty : -+stockQty
    try {
      await adjustStock.mutateAsync({ id: stockProduct.id, quantity: qty, reason: stockReason || undefined })
      toast.success(stockDir === 'entry' ? `Entrada de ${num(+stockQty)} registrada.` : `Saída de ${num(+stockQty)} registrada.`)
      setStockProduct(null); setStockQty(''); setStockReason('')
    } catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível ajustar o estoque.')) }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try { await createCategory.mutateAsync(newCatName.trim()); toast.success('Categoria criada.'); setNewCatName('') }
    catch (err) { toast.error(apiErrorMessage(err, 'Não foi possível criar a categoria.')) }
  }

  const lowStock = products?.filter(p => p.isLowStock) ?? []
  const nextQty = stockProduct ? stockProduct.stockQuantity + (stockDir === 'entry' ? 1 : -1) * (+stockQty || 0) : 0

  return (
    <div className="space-y-5">
      <PageHeader title="Produtos" subtitle="Estoque do que a barbearia vende no balcão."
        actions={<Button onClick={openCreate}><Plus size={16} /> <span className="lbl-long">Novo produto</span><span className="lbl-short">Novo</span></Button>} />

      <Tabs value={tab} onChange={setTab} ariaLabel="Seções" options={[
        { value: 'products', label: 'Produtos' },
        { value: 'categories', label: 'Categorias' },
      ]} />

      {tab === 'products' && lowStock.length > 0 && (
        <div className="ds-notice ds-notice-warn" role="status">
          <AlertTriangle size={16} />
          <span><strong>Estoque baixo:</strong> {lowStock.map(p => `${p.name} (${num(p.stockQuantity)})`).join(', ')}.</span>
        </div>
      )}

      {tab === 'categories' && (
        <Panel title="Categorias" description="Agrupam os produtos na lista e nos relatórios." split pad={false}>
          <form onSubmit={handleCreateCategory} className="flex gap-2 p-5 max-lg:p-4 border-b border-line">
            <input className="ds-input flex-1" placeholder="Nome da nova categoria" value={newCatName}
              onChange={e => setNewCatName(e.target.value)} required aria-label="Nome da nova categoria" />
            <Button type="submit" variant="secondary" loading={createCategory.isPending}><Plus size={16} /> Adicionar</Button>
          </form>
          {categories?.length ? (
            <ul className="ds-list">
              {categories.map(c => {
                const count = products?.filter(p => p.categoryId === c.id).length ?? 0
                return (
                  <li key={c.id} className="ds-row">
                    <Tag size={15} className="text-ink-3" />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-13 text-ink-3 t-num">{count} {count === 1 ? 'produto' : 'produtos'}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <EmptyState title="Nenhuma categoria" hint="Ex.: Finalizadores, Barba, Bebidas." />
          )}
        </Panel>
      )}

      {tab === 'products' && (
        isLoading ? <ListSkeleton rows={5} /> : !products?.length ? (
          <EmptyState boxed icon={Package} title="Nenhum produto cadastrado"
            hint="Cadastre pomadas, óleos e bebidas para controlar o estoque e o lucro de cada venda."
            action={<Button variant="secondary" onClick={openCreate}><Plus size={16} /> Cadastrar produto</Button>} />
        ) : desktop ? (
          <Panel pad={false}>
            <div className="ds-table-scroll">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th className="ds-right">Preço</th>
                    <th className="ds-right">Margem</th>
                    <th className="ds-right">Estoque</th>
                    <th><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const m = margin(p)
                    return (
                      <tr key={p.id}>
                        <td>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-13 text-ink-3">{[p.description, p.sku && `Cód. ${p.sku}`].filter(Boolean).join('. ') || ' '}</p>
                        </td>
                        <td className="ds-muted">{p.categoryName}</td>
                        <td className="ds-num">
                          <p className="font-semibold">{brl(p.salePrice)}</p>
                          <p className="text-13 text-ink-3">custo {brl(p.costPrice)}</p>
                        </td>
                        <td className="ds-num ds-muted">{m === null ? '—' : `${m}%`}</td>
                        <td className="ds-num">
                          <p className="flex items-center justify-end gap-1.5 font-semibold" style={{ color: p.isLowStock ? 'var(--warn)' : undefined }}>
                            {p.isLowStock && <AlertTriangle size={14} aria-label="Estoque baixo" />}{num(p.stockQuantity)}
                          </p>
                          <p className="text-13 text-ink-3">mínimo {num(p.minStockAlert)}</p>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openStock(p)}><ArrowDownUp size={15} /> Estoque</Button>
                            <Button variant="ghost" size="sm" icon onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`}><Pencil size={15} /></Button>
                            <Button variant="ghost" size="sm" icon onClick={() => setConfirmDelete(p)} aria-label={`Excluir ${p.name}`}><Trash2 size={15} /></Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          <Panel pad={false}>
            <ul className="ds-list">
              {products.map(p => (
                <li key={p.id} className="flex items-stretch border-b border-line last:border-b-0">
                  <button type="button" className="ds-row border-0 flex-1" onClick={() => openEdit(p)}>
                    <div className="ds-row-main">
                      <p className="ds-row-title">{p.name}</p>
                      <p className="ds-row-sub">
                        <span className={p.isLowStock ? 'text-warn font-medium' : ''}>{num(p.stockQuantity)} em estoque</span>, {brl(p.salePrice)}
                      </p>
                    </div>
                    {p.isLowStock && <Pill tone="warn">Baixo</Pill>}
                  </button>
                  <button type="button" onClick={() => openStock(p)} className="px-4 border-l border-line text-ink-2" aria-label={`Ajustar estoque de ${p.name}`}>
                    <ArrowDownUp size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar produto' : 'Novo produto'}
        footer={<>
          {editing && <Button variant="danger-ghost" className="sm:mr-auto" onClick={() => setConfirmDelete(editing)}><Trash2 size={15} /> Excluir</Button>}
          <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          <Button type="submit" form="product-form" loading={createProduct.isPending || updateProduct.isPending}>{editing ? 'Salvar' : 'Cadastrar'}</Button>
        </>}>
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nome" value={form.name} onChange={set('name')} required placeholder="Ex.: Pomada modeladora 120 g" />
          <Input label="Descrição" optional value={form.description} onChange={set('description')} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Categoria" value={form.categoryId} onChange={set('categoryId')}>
              <option value="">Geral</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Input label="Código (SKU)" optional value={form.sku} onChange={set('sku')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Preço de venda (R$)"><NumberField step="0.01" min="0" value={form.salePrice} onChange={setNum('salePrice')} placeholder="0,00" required /></Field>
            <Field label="Custo (R$)" hint={margin(form) !== null ? `Margem de ${margin(form)}%` : undefined}><NumberField step="0.01" min="0" value={form.costPrice} onChange={setNum('costPrice')} placeholder="0,00" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {!editing && <Field label="Estoque inicial"><NumberField min="0" value={form.initialStock} onChange={setNum('initialStock')} /></Field>}
            <Field label="Avisar quando chegar a" hint="Quantidade mínima"><NumberField min="0" value={form.minStockAlert} onChange={setNum('minStockAlert')} placeholder="5" /></Field>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!stockProduct} onClose={() => setStockProduct(null)} title="Ajustar estoque" subtitle={stockProduct?.name}
        footer={<>
          <Button variant="secondary" onClick={() => setStockProduct(null)}>Cancelar</Button>
          <Button type="submit" form="stock-form" loading={adjustStock.isPending}>{stockDir === 'entry' ? 'Registrar entrada' : 'Registrar saída'}</Button>
        </>}>
        {stockProduct && (
          <form id="stock-form" onSubmit={handleStock} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {([['entry', 'Entrada', 'Compra, reposição'], ['exit', 'Saída', 'Venda, perda, uso']] as const).map(([v, label, desc]) => (
                <button key={v} type="button" className="ds-choice" aria-pressed={stockDir === v} onClick={() => setStockDir(v)}>
                  <span className="text-sm font-semibold">{label}</span>
                  <span className="text-xs text-ink-2">{desc}</span>
                </button>
              ))}
            </div>
            <Input label="Quantidade" type="number" min="1" inputMode="numeric" value={stockQty} onChange={e => setStockQty(e.target.value)} required
              hint={<>Hoje: <span className="t-num font-medium text-ink">{num(stockProduct.stockQuantity)}</span>{stockQty ? <>, fica <span className="t-num font-medium text-ink">{num(nextQty)}</span></> : null}</>} />
            <Input label="Motivo" optional value={stockReason} onChange={e => setStockReason(e.target.value)} placeholder="Ex.: compra do fornecedor" />
          </form>
        )}
      </Modal>

      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={`Excluir ${confirmDelete?.name ?? 'produto'}?`}
        footer={<>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Voltar</Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteProduct.isPending}>Excluir produto</Button>
        </>}>
        <p className="text-sm text-ink-2">O produto sai da lista e do controle de estoque.</p>
      </Modal>
    </div>
  )
}
