// ⚠️ DELETE THIS FILE IN PRODUCTION
// In-memory storage for development mode

export interface DevCategory {
  id: string
  documentId: string
  name: string
  slug: string
  order: number
}

export interface DevProduct {
  id: string
  documentId: string
  name: string
  description: string
  price: number
  stock: number
  active: boolean
  year?: string
  category?: { id: string; name: string }
}

// Initial data
const initialCategories: DevCategory[] = [
  { id: 'dev-cat-1', documentId: 'dev-cat-1', name: 'Cidres', slug: 'cidres', order: 1 },
  { id: 'dev-cat-2', documentId: 'dev-cat-2', name: 'Spiritueux', slug: 'spiritueux', order: 2 },
  { id: 'dev-cat-3', documentId: 'dev-cat-3', name: 'Cuisine', slug: 'cuisine', order: 3 },
]

const initialProducts: DevProduct[] = [
  { id: 'dev-1', documentId: 'dev-1', name: 'Cidre Brut 2024', description: 'Cidre brut artisanal', price: 9, stock: 30, active: true, year: '2024', category: { id: 'dev-cat-1', name: 'Cidres' } },
  { id: 'dev-2', documentId: 'dev-2', name: 'Cidre Doux 2025', description: 'Cidre doux et fruité', price: 9, stock: 25, active: true, year: '2025', category: { id: 'dev-cat-1', name: 'Cidres' } },
  { id: 'dev-3', documentId: 'dev-3', name: 'Eau-de-vie de pomme', description: 'Eau-de-vie distillée', price: 35, stock: 15, active: true, category: { id: 'dev-cat-2', name: 'Spiritueux' } },
]

// Global storage (persists during server session)
let categories: DevCategory[] = [...initialCategories]
let products: DevProduct[] = [...initialProducts]

// ========== CATEGORIES ==========

export function getDevCategories(): DevCategory[] {
  return [...categories].sort((a, b) => a.order - b.order)
}

export function createDevCategory(data: Partial<DevCategory>): DevCategory {
  const id = `dev-cat-${Date.now()}`
  const newCat: DevCategory = {
    id,
    documentId: id,
    name: data.name || 'New category',
    slug: data.slug || data.name?.toLowerCase().replace(/\s+/g, '-') || 'new-category',
    order: data.order ?? categories.length + 1,
  }
  categories.push(newCat)
  return newCat
}

export function updateDevCategory(id: string, data: Partial<DevCategory>): DevCategory | null {
  const index = categories.findIndex(c => c.id === id || c.documentId === id)
  if (index === -1) return null
  
  categories[index] = { ...categories[index], ...data }
  return categories[index]
}

export function deleteDevCategory(id: string): boolean {
  const index = categories.findIndex(c => c.id === id || c.documentId === id)
  if (index === -1) return false
  
  categories.splice(index, 1)
  return true
}

// ========== PRODUCTS ==========

// Return products normalized for frontend (category as string, categoryId as id)
export function getDevProducts() {
  return products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    stock: p.stock,
    active: p.active,
    year: p.year,
    category: p.category?.name || 'Non catégorisé',
    categoryId: p.category?.id,
  }))
}

export function createDevProduct(data: Partial<DevProduct> & { categoryId?: string }) {
  const id = `dev-prod-${Date.now()}`
  const cat = data.categoryId ? categories.find(c => c.id === data.categoryId) : null
  
  const newProd: DevProduct = {
    id,
    documentId: id,
    name: data.name || 'New product',
    description: data.description || '',
    price: data.price ?? 0,
    stock: data.stock ?? 0,
    active: data.active ?? true,
    year: data.year,
    category: cat ? { id: cat.id, name: cat.name } : undefined,
  }
  products.push(newProd)
  
  // Return normalized format
  return {
    id: newProd.id,
    name: newProd.name,
    description: newProd.description,
    price: newProd.price,
    stock: newProd.stock,
    active: newProd.active,
    year: newProd.year,
    category: newProd.category?.name || 'Non catégorisé',
    categoryId: newProd.category?.id,
  }
}

export function updateDevProduct(id: string, data: Partial<DevProduct> & { categoryId?: string }) {
  const index = products.findIndex(p => p.id === id || p.documentId === id)
  if (index === -1) return null
  
  if (data.categoryId !== undefined) {
    const cat = data.categoryId ? categories.find(c => c.id === data.categoryId) : null
    data.category = cat ? { id: cat.id, name: cat.name } : undefined
  }
  
  products[index] = { ...products[index], ...data }
  const p = products[index]
  
  // Return normalized format
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    stock: p.stock,
    active: p.active,
    year: p.year,
    category: p.category?.name || 'Non catégorisé',
    categoryId: p.category?.id,
  }
}

export function deleteDevProduct(id: string): boolean {
  const index = products.findIndex(p => p.id === id || p.documentId === id)
  if (index === -1) return false
  
  products.splice(index, 1)
  return true
}
