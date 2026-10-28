// src/data/deepgmart.js
import 'dotenv/config'
import fs from 'fs'
import path from 'path'

const DEEPGLOBAL_PATH = process.env.DEEPGLOBAL_PATH || 'C:/projects/deepglobal'
const PRODUCTS_JSON_PATH = process.env.PRODUCTS_JSON_PATH || path.join(DEEPGLOBAL_PATH, 'src/lib/data/products.json')

import dotenv from 'dotenv'
dotenv.config()

export const STORE_URL = process.env.STORE_URL || 'https://www.deepglobal.com.sg/shop'
const STORE_BASE = STORE_URL.replace(/\/shop\/?$/, '')

let allProducts = []
try {
  if (fs.existsSync(PRODUCTS_JSON_PATH)) {
    allProducts = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'))
  }
} catch (err) {
  console.warn('[deepgmart.js] Failed to load deepglobal products.json:', err.message)
}

export function formatPrice(cents) {
  if (typeof cents !== 'number' || cents <= 0) return 'Price unavailable'
  return `S$${(cents / 100).toFixed(2)}`
}

export function getProductImageBuffer(imageRelativePath) {
  if (!imageRelativePath) return null
  try {
    const cleanRel = imageRelativePath.replace(/^\//, '')
    const fullPath = path.join(DEEPGLOBAL_PATH, 'public', cleanRel)
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath)
    }
  } catch (err) {
    console.warn('[deepgmart.js] Error reading product image:', err.message)
  }
  return null
}

export function getBannerBuffer() {
  const localBanner = path.join(process.cwd(), 'src/assets/deepgmart-banner.jpg')
  if (fs.existsSync(localBanner)) return fs.readFileSync(localBanner)
  const extBanner = path.join(DEEPGLOBAL_PATH, 'public/assets/img/brand/grocery-basket.jpg')
  if (fs.existsSync(extBanner)) return fs.readFileSync(extBanner)
  return null
}

export function getProductBySlug(slug, refresh = true) {
  if (refresh) refreshProducts()
  const cleanSlug = slug.replace(/^prod_/, '')
  const product = allProducts.find(p => p.slug === cleanSlug || p.id === cleanSlug)
  if (!product) return null

  return {
    id: `prod_${product.slug}`,
    slug: product.slug,
    title: product.title,
    dept: product.dept,
    available: product.in_stock === true,
    purchasable: product.purchasable === true,
    variants: product.variants || [],
    price: formatPrice(product.price),
    price_cents: product.price,
    imageRelative: product.images?.[0] || null,
    desc: product.short_desc || `${product.title} available at DeepGmart Singapore.`,
    url: `${STORE_BASE}/products/${product.slug}`,
  }
}


export function refreshProducts() {
  // Read on every request so missing or invalid inventory fails closed.
  try {
    const data = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'))
    if (!Array.isArray(data)) throw new Error('Invalid catalogue')
    allProducts = data
  } catch { allProducts = [] }
}
export function listProducts(dept = null) {
  refreshProducts()
  return allProducts.filter(p => p.purchasable === true && (!dept || p.dept === dept))
    .sort((a,b) => a.title.localeCompare(b.title))
    .map(p => getProductBySlug(p.slug, false))
}
export function getCategories() {
  refreshProducts()
  const counts = new Map()
  for (const p of allProducts.filter(p => p.purchasable === true)) counts.set(p.dept || 'other', (counts.get(p.dept || 'other') || 0) + 1)
  return [...counts].sort().map(([id,count]) => ({ id, title: id.charAt(0).toUpperCase() + id.slice(1), count }))
}
export function searchProducts(query, limit = Infinity) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return listProducts().filter(p => {
    const text = [p.title, p.dept, p.desc].join(' ').toLowerCase()
    return words.every(word => text.includes(word))
  }).slice(0, limit)
}
