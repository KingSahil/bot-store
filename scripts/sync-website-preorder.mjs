import fs from 'node:fs'
import path from 'node:path'
import { preorderCatalogue } from '../src/data/preorderCatalogue.js'

process.env.BOT_MODE = 'preorder'
delete process.env.PREORDER_PRODUCTS_JSON_PATH
delete process.env.PRODUCTS_JSON_PATH
const { listProducts } = await import('../src/data/deepgmart.js')
const site = process.env.DEEPGLOBAL_PATH || 'C:/Projects/deepglobal'
const destination = path.join(site, 'src/lib/data/preorder.json')
const previous = new Map(JSON.parse(fs.readFileSync(destination, 'utf8')).map(row => [row.slug, row]))
const listings = new Map(listProducts().map(row => [row.slug, row]))
const rows = preorderCatalogue.map(product => {
  const listing = listings.get(product.slug)
  const photo = listing?.imageRelative
  if (!photo || !fs.existsSync(path.join(site, 'public', photo))) {
    throw new Error(`Missing website photo for ${product.title}`)
  }
  return {
    slug: product.slug,
    title: product.title,
    category: product.dept,
    unit: listing.unit || '',
    ...(product.preorder.pack ? { pack: product.preorder.pack } : {}),
    photo,
    available: listing.available,
    tiers: listing.priceTiers || [],
    terms: listing.boardTerms,
    photoNote: previous.get(product.slug)?.photoNote || '',
    supplierPrice: listing.pricingPending && listing.price.startsWith('Supplier list ')
      ? listing.price.replace(' · Selling price pending', '') : '',
  }
})
if (new Set(rows.map(row => row.slug)).size !== rows.length) throw new Error('Duplicate pre-order slugs')
const tmp = destination + '.tmp'
fs.writeFileSync(tmp, JSON.stringify(rows, null, 2) + '\n')
fs.renameSync(tmp, destination)
console.log(`Synced ${rows.length} photo-backed listings to DeepGmart Pre-order`)
