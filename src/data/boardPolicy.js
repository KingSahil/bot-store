export function belongsToBoard(product, mode) {
  return (product.stock_board ?? 'normal') === mode
}

export function boardTerms(product, mode) {
  if (mode === 'wholesale') {
    const p = product.wholesale
    if (!p || ![p.pack_units, p.min_packs, p.increment, p.price_cents].every(n => Number.isSafeInteger(n) && n > 0) || p.min_packs > 99) return null
    return { price: p.price_cents, minimum: p.min_packs, increment: p.increment,
      description: `${p.pack_units} units per pack. Minimum ${p.min_packs} packs; increments of ${p.increment} packs. Quantity means packs. Store confirms stock, delivery and payment.` }
  }
  if (mode === 'preorder') {
    const p = product.preorder
    if (!p || typeof p.arrival !== 'string' || !p.arrival.trim() || typeof p.terms !== 'string' || !p.terms.trim()) return null
    if (p.cutoff && (!Number.isFinite(Date.parse(p.cutoff)) || Date.parse(p.cutoff) <= Date.now())) return null
    return { price: product.price, minimum: 1, increment: 1,
      description: `Pre-order — expected arrival: ${p.arrival}. ${p.terms}${p.cutoff ? ` Order by ${p.cutoff}.` : ''} Store confirms allocation, delivery and payment.` }
  }
  return { price: product.price, minimum: 1, increment: 1, description: '' }
}

export function validateBoardQuantity(product, quantity) {
  if (quantity < product.minimum || (quantity - product.minimum) % product.increment !== 0) throw new Error(`Minimum ${product.minimum}; increase quantity in steps of ${product.increment}. Wholesale quantity means packs.`)
}
