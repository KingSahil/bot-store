// src/data/deepgmart.js
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { botConfig } from '../config.js'
import { belongsToBoard, boardTerms } from './boardPolicy.js'

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
  if (!belongsToBoard(product, botConfig.mode)) return null
  const terms = boardTerms(product, botConfig.mode)
  if (!terms) return null
  // Special-board offers currently support single-SKU products only.
  if (botConfig.mode !== 'normal' && product.variants?.length) return null

  return {
    id: `prod_${product.slug}`,
    slug: product.slug,
    title: product.title,
    dept: product.dept,
    available: botConfig.mode === 'preorder' ? product.preorder.accepting_orders === true : product.in_stock === true,
    purchasable: product.purchasable === true,
    variants: product.variants || [],
    board: botConfig.mode,
    minimum: terms.minimum,
    increment: terms.increment,
    boardTerms: terms.description,
    price: formatPrice(terms.price),
    price_cents: terms.price,
    imageRelative: product.images?.[0] || null,
    desc: [product.short_desc || `${product.title} available at DeepGmart Singapore.`, terms.description].filter(Boolean).join('\n'),
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
    .map(p => getProductBySlug(p.slug, false)).filter(Boolean)
}
export function getCategories() {
  refreshProducts()
  const counts = new Map()
  for (const p of listProducts()) counts.set(p.dept || 'other', (counts.get(p.dept || 'other') || 0) + 1)
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
