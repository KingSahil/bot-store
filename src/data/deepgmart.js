// src/data/deepgmart.js
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { botConfig } from '../config.js'
import { belongsToBoard, boardTerms } from './boardPolicy.js'
import { preorderCatalogue } from './preorderCatalogue.js'
import { buildWholesaleCatalogue, wholesaleCatalogue } from './wholesaleCatalogue.js'
import sharp from 'sharp'
import { mergedSupplierPrice } from './mergedSupplierPrices.js'
import winthreePrices from './winthreePrices.json' with { type: 'json' }
import mullaiPrices from './mullaiReferencePrices.json' with { type: 'json' }
import babaPrices from './babaReferencePrices.json' with { type: 'json' }

const DEEPGLOBAL_PATH = process.env.DEEPGLOBAL_PATH || 'C:/projects/deepglobal'
const WEBSITE_PRODUCTS_PATH = path.join(DEEPGLOBAL_PATH, 'src/lib/data/products.json')
const PRODUCTS_JSON_PATH = botConfig.mode === 'preorder'
  ? process.env.PREORDER_PRODUCTS_JSON_PATH || process.env.PRODUCTS_JSON_PATH
  : botConfig.mode === 'wholesale'
    ? process.env.WHOLESALE_PRODUCTS_JSON_PATH || process.env.PRODUCTS_JSON_PATH
    : process.env.PRODUCTS_JSON_PATH || WEBSITE_PRODUCTS_PATH

import dotenv from 'dotenv'
dotenv.config()

export const STORE_URL = process.env.STORE_URL || 'https://www.deepglobal.com.sg/shop'
const STORE_BASE = STORE_URL.replace(/\/shop\/?$/, '')

let allProducts = []
let wholesaleWebsiteVersion
let combinedWholesale = wholesaleCatalogue
try {
  if (PRODUCTS_JSON_PATH && fs.existsSync(PRODUCTS_JSON_PATH)) {
    allProducts = JSON.parse(fs.readFileSync(PRODUCTS_JSON_PATH, 'utf8'))
  }
} catch (err) {
  console.warn('[deepgmart.js] Failed to load deepglobal products.json:', err.message)
}

export function formatPrice(cents) {
  if (typeof cents !== 'number' || cents <= 0) return 'Price unavailable'
  return `S$${(cents / 100).toFixed(2)}`
}

export async function getProductImageBuffer(imageRelativePath) {
  if (!imageRelativePath) return null
  try {
    const cleanRel = imageRelativePath.replace(/^\//, '')
    const fullPath = path.join(DEEPGLOBAL_PATH, 'public', cleanRel)
    if (fs.existsSync(fullPath)) {
      // WhatsApp image messages use JPEG; supplier photos also include WebP and PNG.
      return await sharp(fs.readFileSync(fullPath))
        .rotate()
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 90 })
        .toBuffer()
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
  return describeProduct(product)
}

function describeProduct(product) {
  if (!belongsToBoard(product, botConfig.mode)) return null
  const terms = boardTerms(product, botConfig.mode)
  if (!terms) return null
  const referencePrice = botConfig.mode === 'preorder' && terms.pricingPending &&
    product.preorder.supplier_reference_cents
  const supplierSlug = product.slug.replace(/^(preorder|wholesale)-supplier-/, '')
  const winthreeRow = /^winthree-(\d+)$/.exec(supplierSlug)?.[1] ||
    (/^old-monk-rum-750ml$/.test(supplierSlug.replace(/^(preorder|wholesale)-/, '')) ? '8' : null)
  const winthree = winthreeRow && winthreePrices.find(row => row.row === Number(winthreeRow))
  const supplierPrice = winthree
    ? [winthree.unit, winthree.row === 1 ? 'per can' : 'per bottle', winthree.carton, `${winthree.pack} units, incl. GST`]
    : mergedSupplierPrice(supplierSlug) || mullaiPrices[supplierSlug] || babaPrices[supplierSlug]
  const [unitCents, unitLabel, cartonCents, cartonSize] = supplierPrice || []
  const unitReference = unitCents ? `${formatPrice(unitCents)} ${unitLabel}`.trim() : ''
  const cartonReference = cartonCents ? `${formatPrice(cartonCents)} per carton${cartonSize ? ` (${cartonSize})` : ''}` : ''
  const listedReference = botConfig.mode === 'wholesale'
    ? cartonReference || unitReference : unitReference || cartonReference
  const pendingPrice = listedReference ? `Supplier list ${listedReference}` : referencePrice
    ? `Supplier list ${formatPrice(referencePrice)} · Selling price pending`
    : botConfig.mode === 'wholesale' ? 'Wholesale price coming soon' : 'Contact on WhatsApp for price'
  // Special-board offers currently support single-SKU products only.
  if (botConfig.mode !== 'normal' && product.variants?.length) return null

  return {
    id: `prod_${product.slug}`,
    slug: product.slug,
    title: product.title,
    dept: product.dept,
    available: terms.pricingPending ? false : botConfig.mode === 'preorder' ? product.preorder.accepting_orders === true : product.in_stock === true,
    pricingPending: terms.pricingPending === true,
    purchasable: product.purchasable === true,
    variants: product.variants || [],
    board: botConfig.mode,
    minimum: terms.minimum,
    increment: terms.increment,
    boardTerms: terms.description,
    unit: terms.unit,
    priceTiers: terms.priceTiers,
    price: terms.pricingPending ? pendingPrice : formatPrice(terms.price),
    price_cents: terms.price,
    imageRelative: product.images?.[0] || null,
    desc: [product.short_desc || `${product.title} available at DeepGmart Singapore.`,
      listedReference && `Printed supplier prices: ${[unitReference, cartonReference].filter(Boolean).join(' · ')}.`,
      winthree && !winthree.totalsAgree && 'Winthree’s printed figures differ from the calculated totals. Store confirmation is pending.',
      terms.description].filter(Boolean).join('\n'),
    url: botConfig.mode === 'normal' ? `${STORE_BASE}/products/${product.slug}` : null,
  }
}

function getWholesaleProducts() {
  try {
    const stat = fs.statSync(WEBSITE_PRODUCTS_PATH)
    const version = `${stat.mtimeMs}:${stat.size}`
    if (version !== wholesaleWebsiteVersion) {
      const products = JSON.parse(fs.readFileSync(WEBSITE_PRODUCTS_PATH, 'utf8'))
      if (!Array.isArray(products)) throw new Error('Invalid website catalogue')
      combinedWholesale = buildWholesaleCatalogue(products)
      wholesaleWebsiteVersion = version
    }
  } catch {
    // A failed local website snapshot must leave supplier listings browsable.
    combinedWholesale = wholesaleCatalogue
    wholesaleWebsiteVersion = undefined
  }
  return combinedWholesale
}

export function refreshProducts() {
  if (!PRODUCTS_JSON_PATH) {
    allProducts = botConfig.mode === 'wholesale' ? getWholesaleProducts() : preorderCatalogue
    return
  }
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
    .map(describeProduct).filter(Boolean)
}
export function getCategories() {
  const counts = new Map()
  for (const p of listProducts()) counts.set(p.dept || 'other', (counts.get(p.dept || 'other') || 0) + 1)
  if (botConfig.mode === 'wholesale' && !counts.has('liquor')) counts.set('liquor', 0)
  return [...counts].sort().map(([id,count]) => ({ id, title: id === 'liquor' ? 'Liquor' : id === 'beverages' ? 'Non-alcoholic drinks' : id.charAt(0).toUpperCase() + id.slice(1), count }))
}
export function searchProducts(query, limit = Infinity) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return listProducts().filter(p => {
    const text = [p.title, p.dept, p.desc].join(' ').toLowerCase()
    return words.every(word => text.includes(word))
  }).slice(0, limit)
}
