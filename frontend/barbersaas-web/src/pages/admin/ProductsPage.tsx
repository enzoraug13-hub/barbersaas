import { useState } from 'react'
import { Plus, Trash2, Package, AlertTriangle, Edit2, TrendingUp, TrendingDown, Tag } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { NumberField } from '../../components/ui/NumberField'
import {
  useProducts, useProductCategories, useCreateProduct,
  useUpdateProduct, useDeleteProduct, useAdjustStock, useCreateCategory,
} from '../../features/products/productsApi'
import type { Product } from '../../types'
import toast from 'react-hot-toast'

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const EMPTY_FORM = { name: '', description: '', salePrice: 0, costPrice: 0, initialStock: 0, minStockAlert: 5, sku: '', categoryId: '' }

export default function ProductsPage() {
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
  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [stockQty, setStockQty]     = useState('')
  const [stockReason, setStockReason] = useState('')
  const [stockDir, setStockDir]     = useState<'entry' | 'exit'>('entry')
  const [form, setForm]             = useState(EMPTY_FORM)

  // Campos numéricos usam NumberField (onChange já entrega número) — este helper
  // fica só para os campos de texto/select.
  const set = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  const setNum = (k: 'salePrice' | 'costPrice' | 'initialStock' | 'minStockAlert') =>
    (v: number) => setForm(f => ({ ...f, [k]: v }))

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true) }
  const openEdit   = (p: Product) => {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', salePrice: p.salePrice, costPrice: p.costPrice, initialStock: 0, minStockAlert: p.minStockAlert, sku: p.sku ?? '', categoryId: p.categoryId })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, name: form.name, description: form.description || undefined, salePrice: form.salePrice, costPrice: form.costPrice, minStockAlert: form.minStockAlert, sku: form.sku || undefined, categoryId: form.categoryId })
        toast.success('Produto atualizado!')
      } else {
        await createProduct.mutateAsync({ ...form, description: form.description || undefined, sku: form.sku || undefined })
        toast.success('Produto criado!')
      }
      setShowForm(false)
    } catch { toast.error('Erro ao salvar produto.') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este produto?')) return
    try { await deleteProduct.mutateAsync(id); toast.success('Produto excluído.') }
    catch { toast.error('Erro ao excluir.') }
  }

  const handleStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockProduct) return
    const qty = stockDir === 'entry' ? +stockQty : -+stockQty
    try {
      await adjustStock.mutateAsync({ id: stockProduct.id, quantity: qty, reason: stockReason || undefined })
      toast.success('Estoque ajustado!')
      setStockProduct(null); setStockQty(''); setStockReason('')
    } catch { toast.error('Erro ao ajustar estoque.') }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    try { await createCategory.mutateAsync(newCatName.trim()); toast.success('Categoria criada!'); setNewCatName('') }
    catch { toast.error('Erro ao criar categoria.') }
  }

  const lowStock = products?.filter(p => p.isLowStock) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="ds-page-title">Produtos</h2>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setTab('categories')} style={tab === 'categories' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}>
            <Tag size={15} /> Categorias
          </Button>
          <Button onClick={openCreate}><Plus size={18} /> Novo Produto</Button>
        </div>
      </div>

      {/* Alerta estoque baixo */}
      {lowStock.length > 0 && (
        <div className="flex items-start gap-3" style={{ background: 'rgba(224,160,48,0.1)', border: '1px solid rgba(224,160,48,0.3)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
          <div>
            <p className="font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)' }}>Estoque baixo em {lowStock.length} produto(s)</p>
            <p className="mt-0.5" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', opacity: 0.8 }}>{lowStock.map(p => p.name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tab Categorias */}
      {tab === 'categories' && (
        <Card className="space-y-4">
          <h3 className="ds-section-title">Categorias</h3>
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input className="ds-input flex-1" placeholder="Nome da nova categoria" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
            <Button type="submit" loading={createCategory.isPending}>{!createCategory.isPending && <Plus size={16} />}</Button>
          </form>
          {categories?.length ? (
            <ul>
              {categories.map(c => (
                <li key={c.id} className="flex items-center gap-2 py-2.5" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <Tag size={13} style={{ color: 'var(--accent)' }} /> {c.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ds-text-disabled text-center py-4" style={{ fontSize: 'var(--text-sm)' }}>Nenhuma categoria. Crie uma acima.</p>
          )}
        </Card>
      )}

      {/* Lista de Produtos */}
      {tab === 'products' && (
        isLoading ? (
          <ListSkeleton />
        ) : !products?.length ? (
          <EmptyState icon={Package} title="Nenhum produto cadastrado"
            action={<Button onClick={openCreate}>Cadastrar primeiro produto</Button>} />
        ) : (
          <div className="ds-table-wrap">
            <div className="overflow-x-auto">
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="hidden md:table-cell">Categoria</th>
                    <th className="text-right">Venda</th>
                    <th className="text-center">Estoque</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => (
                    <tr key={p.id}>
                      <td>
                        <p className="ds-text-primary font-medium">{p.name}</p>
                        {p.sku && <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>SKU: {p.sku}</p>}
                        {p.description && <p className="ds-text-disabled truncate max-w-[200px]" style={{ fontSize: 'var(--text-xs)' }}>{p.description}</p>}
                      </td>
                      <td className="ds-text-secondary hidden md:table-cell">{p.categoryName}</td>
                      <td className="text-right">
                        <p className="ds-text-accent font-semibold">{fmt(p.salePrice)}</p>
                        <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>custo: {fmt(p.costPrice)}</p>
                      </td>
                      <td className="text-center">
                        <span className="font-bold" style={{ fontSize: 'var(--text-sm)', color: p.isLowStock ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                          {p.stockQuantity}
                        </span>
                        {p.isLowStock && <AlertTriangle size={12} className="inline ml-1" style={{ color: 'var(--color-warning)' }} />}
                        <p className="ds-text-disabled" style={{ fontSize: 'var(--text-xs)' }}>mín: {p.minStockAlert}</p>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setStockProduct(p); setStockDir('entry'); setStockQty(''); setStockReason('') }}
                            className="ds-icon-btn" title="Ajustar estoque">
                            <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
                          </button>
                          <button onClick={() => openEdit(p)} className="ds-icon-btn" title="Editar">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="ds-icon-btn" title="Excluir" style={{ color: 'var(--color-error)' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modal criar/editar produto */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Produto' : 'Novo Produto'} panelClassName="max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="ds-field"><label className="ds-label">Nome</label><input className="ds-input" value={form.name} onChange={set('name')} required /></div>
          <div className="ds-field"><label className="ds-label">Descrição</label><input className="ds-input" value={form.description} onChange={set('description')} /></div>
          <div className="ds-field">
            <label className="ds-label">Categoria</label>
            <select className="ds-input" value={form.categoryId} onChange={set('categoryId')}>
              <option value="">-- Selecionar --</option>
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="ds-field"><label className="ds-label">Preço de venda</label><NumberField step="0.01" min="0" value={form.salePrice} onChange={setNum('salePrice')} placeholder="0,00" required /></div>
            <div className="ds-field"><label className="ds-label">Preço de custo</label><NumberField step="0.01" min="0" value={form.costPrice} onChange={setNum('costPrice')} placeholder="0,00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {!editing && (
              <div className="ds-field"><label className="ds-label">Estoque inicial</label><NumberField min="0" value={form.initialStock} onChange={setNum('initialStock')} /></div>
            )}
            <div className="ds-field"><label className="ds-label">Alerta mínimo</label><NumberField min="0" value={form.minStockAlert} onChange={setNum('minStockAlert')} placeholder="5" /></div>
          </div>
          <div className="ds-field"><label className="ds-label">SKU</label><input className="ds-input" value={form.sku} onChange={set('sku')} placeholder="Código interno" /></div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" loading={createProduct.isPending || updateProduct.isPending}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal ajuste de estoque */}
      <Modal isOpen={!!stockProduct} onClose={() => setStockProduct(null)} title="Ajustar Estoque">
        {stockProduct && (
          <>
            <p className="ds-text-accent font-medium mb-1">{stockProduct.name}</p>
            <p className="ds-text-secondary mb-4" style={{ fontSize: 'var(--text-sm)' }}>Estoque atual: <span className="ds-text-primary font-bold">{stockProduct.stockQuantity}</span></p>
            <form onSubmit={handleStock} className="space-y-4">
              <div className="ds-field">
                <label className="ds-label">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setStockDir('entry')}
                    className="flex items-center justify-center gap-2 font-medium"
                    style={{
                      padding: '10px 0', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
                      border: `1px solid ${stockDir === 'entry' ? 'var(--color-success)' : 'var(--border-default)'}`,
                      background: stockDir === 'entry' ? 'rgba(76,175,125,0.1)' : 'transparent',
                      color: stockDir === 'entry' ? 'var(--color-success)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}>
                    <TrendingUp size={14} /> Entrada
                  </button>
                  <button type="button" onClick={() => setStockDir('exit')}
                    className="flex items-center justify-center gap-2 font-medium"
                    style={{
                      padding: '10px 0', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)',
                      border: `1px solid ${stockDir === 'exit' ? 'var(--color-error)' : 'var(--border-default)'}`,
                      background: stockDir === 'exit' ? 'rgba(224,92,92,0.1)' : 'transparent',
                      color: stockDir === 'exit' ? 'var(--color-error)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}>
                    <TrendingDown size={14} /> Saída
                  </button>
                </div>
              </div>
              <div className="ds-field"><label className="ds-label">Quantidade</label><input type="number" min="1" className="ds-input" value={stockQty} onChange={e => setStockQty(e.target.value)} required autoFocus /></div>
              <div className="ds-field"><label className="ds-label">Motivo (opcional)</label><input className="ds-input" value={stockReason} onChange={e => setStockReason(e.target.value)} placeholder="Ex: compra de fornecedor" /></div>
              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setStockProduct(null)}>Cancelar</Button>
                <Button type="submit" className="flex-1" loading={adjustStock.isPending}>Confirmar</Button>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  )
}
