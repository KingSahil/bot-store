import { preorderCatalogue } from './preorderCatalogue.js'
import { belongsToBoard } from './boardPolicy.js'

// The client will supply bulk prices, pack sizes and minimum quantities later.
const pendingListing = (slug, title, dept, images) => ({
  id: slug,
  slug,
  title,
  dept,
  stock_board: 'wholesale',
  images,
  purchasable: true,
  in_stock: false,
  price: 0,
  wholesale: { pricing_pending: true },
})

export const wholesaleCatalogue = preorderCatalogue.map(product => pendingListing(
  product.slug.replace(/^preorder-/, 'wholesale-'), product.title, product.dept, [...product.images],
))

const titleKey = title => title.normalize('NFKD').toLowerCase()
  .replace(/(?<=\d)\s*(?:gms?|gr)\b/g, 'g')
  .replace(/(?<=\d)\s*ltrs?\b/g, 'l')
  .replace(/[^a-z0-9]/g, '')
const supplierTitles = new Set(wholesaleCatalogue.map(product => titleKey(product.title)))
const sizeLabels = {
  'cardamon-100gm': '100 g',
  'crdmon-500gm': '500 g',
  'almond-100-gm': '100 g',
  'almond-250gm': '250 g',
  'mustard-oil-200ml': '200 ml',
  'mustard-oil-500ml': '500 ml',
  'rabina-carton': 'Carton',
  'royal-umbrella-1kg': '1 kg',
}
const duplicateListings = new Map([
  ['3rose-500gm', '3-rose-500g'],
  ['7up-500ml', '7-up-500ml'],
  ['pf-guava250ml', 'pf-guava-250ml'],
])

export function buildWholesaleCatalogue(websiteProducts) {
  const catalogue = [...wholesaleCatalogue]
  const listingKeys = new Set(catalogue.map(product => JSON.stringify([titleKey(product.title), product.images[0]])))
  const visibleProducts = websiteProducts.filter(product => product?.slug && product.title?.trim() &&
    belongsToBoard(product, 'normal') && !product.tags?.includes('catalogue:hidden-pos-group'))
  const websiteSlugs = new Set(visibleProducts.map(product => product.slug))
  for (const product of visibleProducts) {
    if (websiteSlugs.has(duplicateListings.get(product.slug))) continue
    const variants = product.variants || []
    const hasMultipleVariants = variants.length > 1
    for (const variant of variants.length ? variants : [null]) {
      const variantTitle = variant?.title?.trim()
      let title = product.title
      if (hasMultipleVariants && variantTitle) {
        title = variantTitle.startsWith(product.title) ? variantTitle : `${product.title} — ${variantTitle}`
      } else if (sizeLabels[product.slug]) {
        if (product.slug === 'royal-umbrella-1kg') title = title.replace(/\s*\(5 kg\)$/i, '')
        title = `${title} — ${sizeLabels[product.slug]}`
      }
      if (supplierTitles.has(titleKey(title))) continue
      const images = [...new Set([variant?.image, ...(product.images || [])].filter(Boolean))]
      if (!images.length) continue
      const slug = `wholesale-website-${product.slug}${hasMultipleVariants ? `-${variant.id}` : ''}`
      const key = JSON.stringify([titleKey(title), images[0]])
      if (!hasMultipleVariants && listingKeys.has(key)) continue
      if (!hasMultipleVariants) listingKeys.add(key)
      catalogue.push(pendingListing(slug, title, product.dept, images))
    }
  }
  return catalogue
}
