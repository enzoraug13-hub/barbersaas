import { useState } from 'react'
import { Plus, Loader2, Trash2, Package, AlertTriangle, Edit2, X, TrendingUp, TrendingDown, Tag } from 'lucide-react'
import { ListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
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

  const set = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: ['salePrice','costPrice','initialStock','minStockAlert'].includes(k) ? +e.target.value : e.target.value }))

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
        <h2 className="text-xl font-bold text-content">Produtos</h2>
        <div className="flex gap-2">
          <button onClick={() => setTab('categories')} className={`btn-ghost text-sm px-3 py-2 gap-1.5 ${tab === 'categories' ? 'border-accent/50 text-accent' : ''}`}>
            <Tag size={15} /> Categorias
          </button>
          <button onClick={openCreate} className="btn-primary"><Plus size={18} /> Novo Produto</button>
        </div>
      </div>

      {/* Alerta estoque baixo */}
      {lowStock.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Estoque baixo em {lowStock.length} produto(s)</p>
            <p className="text-xs text-amber-400/70 mt-0.5">{lowStock.map(p => p.name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Tab Categorias */}
      {tab === 'categories' && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-content">Categorias</h3>
          <form onSubmit={handleCreateCategory} className="flex gap-2">
            <input className="input flex-1" placeholder="Nome da nova categoria" value={newCatName} onChange={e => setNewCatName(e.target.value)} required />
            <button type="submit" disabled={createCategory.isPending} className="btn-primary px-4">
              {createCategory.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </form>
          {categories?.length ? (
            <ul className="divide-y divide-border">
              {categories.map(c => (
                <li key={c.id} className="py-2.5 flex items-center gap-2 text-sm text-muted">
                  <Tag size={13} className="text-accent" /> {c.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-subtle text-sm text-center py-4">Nenhuma categoria. Crie uma acima.</p>
          )}
        </div>
      )}

      {/* Lista de Produtos */}
      {tab === 'products' && (
        isLoading ? (
          <ListSkeleton />
        ) : !products?.length ? (
          <EmptyState icon={Package} title="Nenhum produto cadastrado"
            action={<button onClick={openCreate} className="btn-primary">Cadastrar primeiro produto</button>} />
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-muted font-medium px-6 py-4">Produto</th>
                    <th className="text-left text-muted font-medium px-4 py-4 hidden md:table-cell">Categoria</th>
                    <th className="text-right text-muted font-medium px-4 py-4">Venda</th>
                    <th className="text-center text-muted font-medium px-4 py-4">Estoque</th>
                    <th className="text-center text-muted font-medium px-4 py-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {products.map(p => (
                    <tr key={p.id} className="hover:bg-surfaceHover/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-content">{p.name}</p>
                        {p.sku && <p className="text-xs text-subtle">SKU: {p.sku}</p>}
                        {p.description && <p className="text-xs text-subtle truncate max-w-[200px]">{p.description}</p>}
                      </td>
                      <td className="px-4 py-4 text-muted hidden md:table-cell">{p.categoryName}</td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-semibold text-accent">{fmt(p.salePrice)}</p>
                        <p className="text-xs text-subtle">custo: {fmt(p.costPrice)}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-sm font-bold ${p.isLowStock ? 'text-amber-400' : 'text-content'}`}>
                          {p.stockQuantity}
                        </span>
                        {p.isLowStock && <AlertTriangle size={12} className="inline ml-1 text-amber-400" />}
                        <p className="text-xs text-subtle">mín: {p.minStockAlert}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => { setStockProduct(p); setStockDir('entry'); setStockQty(''); setStockReason('') }}
                            className="btn-ghost p-1.5 text-xs" title="Ajustar estoque">
                            <TrendingUp size={14} className="text-green-400" />
                          </button>
                          <button onClick={() => openEdit(p)} className="btn-ghost p-1.5" title="Editar">
                            <Edit2 size={14} className="text-muted" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="btn-ghost p-1.5" title="Excluir">
                            <Trash2 size={14} className="text-red-400" />
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
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-content">{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-content"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">Nome</label><input className="input" value={form.name} onChange={set('name')} required /></div>
              <div><label className="label">Descrição</label><input className="input" value={form.description} onChange={set('description')} /></div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={form.categoryId} onChange={set('categoryId')}>
                  <option value="">-- Selecionar --</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Preço de venda</label><input type="number" step="0.01" min="0" className="input" value={form.salePrice} onChange={set('salePrice')} required /></div>
                <div><label className="label">Preço de custo</label><input type="number" step="0.01" min="0" className="input" value={form.costPrice} onChange={set('costPrice')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editing && (
                  <div><label className="label">Estoque inicial</label><input type="number" min="0" className="input" value={form.initialStock} onChange={set('initialStock')} /></div>
                )}
                <div><label className="label">Alerta mínimo</label><input type="number" min="0" className="input" value={form.minStockAlert} onChange={set('minStockAlert')} /></div>
              </div>
              <div><label className="label">SKU</label><input className="input" value={form.sku} onChange={set('sku')} placeholder="Código interno" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={createProduct.isPending || updateProduct.isPending} className="btn-primary flex-1">
                  {(createProduct.isPending || updateProduct.isPending) && <Loader2 size={16} className="animate-spin" />}
                  {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ajuste de estoque */}
      {stockProduct && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setStockProduct(null)}>
          <div className="card w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-content">Ajustar Estoque</h3>
              <button onClick={() => setStockProduct(null)} className="text-muted hover:text-content"><X size={20} /></button>
            </div>
            <p className="text-accent font-medium mb-1">{stockProduct.name}</p>
            <p className="text-sm text-muted mb-4">Estoque atual: <span className="text-content font-bold">{stockProduct.stockQuantity}</span></p>
            <form onSubmit={handleStock} className="space-y-4">
              <div>
                <label className="label">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setStockDir('entry')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${stockDir === 'entry' ? 'border-green-500 bg-green-500/10 text-green-400' : 'border-border text-muted'}`}>
                    <TrendingUp size={14} /> Entrada
                  </button>
                  <button type="button" onClick={() => setStockDir('exit')}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-colors ${stockDir === 'exit' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-border text-muted'}`}>
                    <TrendingDown size={14} /> Saída
                  </button>
                </div>
              </div>
              <div><label className="label">Quantidade</label><input type="number" min="1" className="input" value={stockQty} onChange={e => setStockQty(e.target.value)} required autoFocus /></div>
              <div><label className="label">Motivo (opcional)</label><input className="input" value={stockReason} onChange={e => setStockReason(e.target.value)} placeholder="Ex: compra de fornecedor" /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStockProduct(null)} className="btn-ghost flex-1">Cancelar</button>
                <button type="submit" disabled={adjustStock.isPending} className="btn-primary flex-1">
                  {adjustStock.isPending && <Loader2 size={16} className="animate-spin" />} Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
