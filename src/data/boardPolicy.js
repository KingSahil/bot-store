export function belongsToBoard(product, mode) {
  return (product.stock_board ?? 'normal') === mode
}

export function boardTerms(product, mode) {
  if (mode === 'wholesale') {
    const p = product.wholesale
    if (p?.pricing_pending === true) {
      return {
        price: null,
        minimum: null,
        increment: null,
        pricingPending: true,
        description: 'Bulk supply. Wholesale prices, pack sizes and minimum quantities will be added after the store confirms them.',
      }
    }
    if (!p || ![p.pack_units, p.min_packs, p.increment, p.price_cents].every(n => Number.isSafeInteger(n) && n > 0) || p.min_packs > 99) return null
    return { price: p.price_cents, minimum: p.min_packs, increment: p.increment,
      description: `${p.pack_units} units per pack. Minimum ${p.min_packs} packs; increments of ${p.increment} packs. Quantity means packs. Store confirms stock, delivery and payment.` }
  }
  if (mode === 'preorder') {
    const p = product.preorder
    if (p?.pricing_pending === true) {
      return { price: null, pricingPending: true, description: 'Supplier catalogue item. The store will confirm the selling price, pack size and availability before orders open.' }
    }
    if (!p || typeof p.arrival !== 'string' || !p.arrival.trim() || typeof p.terms !== 'string' || !p.terms.trim()) return null
    if (p.cutoff && (!Number.isFinite(Date.parse(p.cutoff)) || Date.parse(p.cutoff) <= Date.now())) return null
    const priceTiers = p.priceTiers
    if (priceTiers && (!Array.isArray(priceTiers) || priceTiers.length === 0 || priceTiers[0]?.quantity !== 1 ||
      priceTiers.some((tier, i) => !tier || !Number.isSafeInteger(tier.quantity) || tier.quantity <= (priceTiers[i - 1]?.quantity ?? 0) ||
        tier.quantity > 99 || !Number.isSafeInteger(tier.price) || tier.price <= 0))) return null
    const tierText = priceTiers?.length > 1
      ? ` Quantity pricing per ${p.unit || 'item'}: ${priceTiers.map(({ quantity, price }) => `${quantity}+: S$${(price / 100).toFixed(2)}`).join(', ')}.`
      : ''
    return { price: priceTiers?.[0].price ?? product.price, minimum: 1, increment: 1, unit: p.unit, priceTiers,
      description: `Expected arrival: ${p.arrival}. ${p.terms}${tierText}${p.cutoff ? ` Order by ${p.cutoff}.` : ''} Store confirms allocation, delivery and payment.` }
  }
  return { price: product.price, minimum: 1, increment: 1, description: '' }
}

export function validateBoardQuantity(product, quantity) {
  if (quantity < product.minimum || (quantity - product.minimum) % product.increment !== 0) throw new Error(`Minimum ${product.minimum}; increase quantity in steps of ${product.increment}. Wholesale quantity means packs.`)
}
