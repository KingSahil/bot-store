// src/data/deepgmart.js
import fs from 'fs'
import path from 'path'

const DEEPGLOBAL_PATH = 'C:/projects/deepglobal'
const PRODUCTS_JSON_PATH = path.join(DEEPGLOBAL_PATH, 'src/lib/data/products.json')

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
  if (typeof cents !== 'number' || cents <= 0) return 'S$1.50'
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

export function getProductBySlug(slug) {
  const cleanSlug = slug.replace(/^prod_/, '')
  const product = allProducts.find(p => p.slug === cleanSlug || p.id === cleanSlug)
  if (!product) return null

  return {
    id: `prod_${product.slug}`,
    slug: product.slug,
    title: product.title,
    dept: product.dept,
    price: formatPrice(product.price),
    price_cents: product.price,
    imageRelative: product.images?.[0] || null,
    desc: product.short_desc || `${product.title} available at DeepGmart Singapore.`,
    url: `${STORE_BASE}/products/${product.slug}`,
  }
}

export function searchProducts(query, limit = 5) {
  const q = query.trim().toLowerCase()
  if (!q) return []

  return allProducts
    .filter(p => p.purchasable && p.title.toLowerCase().includes(q))
    .slice(0, limit)
    .map(p => ({
      id: `prod_${p.slug}`,
      slug: p.slug,
      title: p.title,
      dept: p.dept,
      price: formatPrice(p.price),
      price_cents: p.price,
      imageRelative: p.images?.[0] || null,
      desc: p.short_desc || `${p.title} available at DeepGmart Singapore.`,
      url: `${STORE_BASE}/products/${p.slug}`,
    }))
}

// Curated catalogue for the interactive menu
export const CURATED_CATALOGUE = [
  {
    title: '🍿 Snacks & Savouries',
    rows: [
      { id: 'prod_haribo-gold-bears', title: 'Haribo Gold Bears', description: 'S$2.50 • Fruit gummy bears' },
      { id: 'prod_laysclsic-salt-82', title: 'Lays Classic Salt 82g', description: 'S$1.40 • Crispy potato chips' },
      { id: 'prod_punjabi-samosa', title: 'Punjabi Samosa', description: 'S$7.90 • Traditional spiced samosas' },
    ],
  },
  {
    title: '🌾 Rice, Dals & Staples',
    rows: [
      { id: 'prod_ragi-aata-1kg', title: 'Ragi Aata 1 kg', description: 'S$2.30 • Nutritious millet flour' },
      { id: 'prod_moong-dal-150gm', title: 'Moong Dal 150 g', description: 'S$2.10 • Yellow split lentils' },
      { id: 'prod_ptnjali-cow-ghe1l', title: 'Patanjali Cow Ghee 1L', description: 'S$14.90 • 100% pure cow ghee' },
      { id: 'prod_paneer-blk', title: 'Fresh Paneer Block', description: 'S$9.90 • Indian cottage cheese' },
    ],
  },
  {
    title: '🌶️ Spices & Masalas',
    rows: [
      { id: 'prod_mdh-pav-bhaji-masala', title: 'MDH Pav Bhaji Masala', description: 'S$2.10 • Classic spice blend' },
      { id: 'prod_chana-masala', title: 'Chana Masala', description: 'S$4.60 • Authentic curry spices' },
      { id: 'prod_turmeric-125g', title: 'Turmeric Powder 125g', description: 'S$1.95 • Pure Haldi powder' },
      { id: 'prod_chat-masala-100g', title: 'Chat Masala 100 g', description: 'S$1.70 • Tangy Indian seasoning' },
    ],
  },
  {
    title: '🥤 Drinks & Chai',
    rows: [
      { id: 'prod_montaindew-325ml', title: 'Mountain Dew 325 ml', description: 'S$0.90 • Citrus soft drink' },
      { id: 'prod_appy-fiz-500ml', title: 'Appy Fizz 500 ml', description: 'S$1.30 • Sparkling apple drink' },
      { id: 'prod_boost', title: 'Boost Energy Drink', description: 'S$6.90 • Malt health drink' },
      { id: 'prod_maxtea-tarik', title: 'Maxtea Tarik', description: 'S$5.60 • Instant milk tea' },
    ],
  },
  {
    title: '🥚 Essentials & Household',
    rows: [
      { id: 'prod_egg', title: 'Farm Fresh Eggs (10-Tray)', description: 'S$2.50 • Fresh Grade A eggs' },
      { id: 'prod_darlie-double', title: 'Darlie Double Action', description: 'S$4.90 • Fresh mint toothpaste' },
      { id: 'prod_3ply100sheets', title: '3-Ply Tissues (100s)', description: 'S$1.50 • Soft facial tissues' },
    ],
  },
]
