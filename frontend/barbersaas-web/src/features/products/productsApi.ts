import { api } from '../../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Product, ProductCategory } from '../../types'

// Quando o dono não escolhe categoria, o form manda "" — que o backend (Guid) não
// converte (400). Enviamos o Guid vazio, que o backend trata criando a categoria "Geral".
const NO_CATEGORY = '00000000-0000-0000-0000-000000000000'

export const useProductCategories = () =>
  useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const res = await api.get('/products/categories')
      return res.data.data as ProductCategory[]
    },
  })

export const useCreateCategory = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post('/products/categories', { name })
      return res.data.data as ProductCategory
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-categories'] }),
  })
}

export const useProducts = () =>
  useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products')
      return res.data.data as Product[]
    },
  })

export const useCreateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      name: string; description?: string; salePrice: number; costPrice: number;
      initialStock: number; minStockAlert: number; sku?: string; categoryId: string
    }) => {
      const res = await api.post('/products', { ...data, categoryId: data.categoryId || NO_CATEGORY })
      return res.data.data as Product
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useUpdateProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string; name: string; description?: string; salePrice: number;
      costPrice: number; minStockAlert: number; sku?: string; categoryId: string
    }) => {
      await api.put(`/products/${id}`, { ...data, categoryId: data.categoryId || NO_CATEGORY })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useAdjustStock = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, quantity, reason }: { id: string; quantity: number; reason?: string }) => {
      const res = await api.patch(`/products/${id}/stock`, { quantity, reason })
      return res.data.data as { stockQuantity: number }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export const useDeleteProduct = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}
