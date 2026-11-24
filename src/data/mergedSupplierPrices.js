// Printed SGD amounts in merged (1).pdf. These are supplier references.
export function mergedSupplierPrice(slug) {
  const prices = {
    'pys-merged-001-01': [2146, 'per 29-piece card'],
    'pys-merged-001-02': [1275, 'per 15-piece card'],
    'pys-merged-001-03': [1080, 'per dozen'],
    'pys-merged-001-04': [80, 'per pack', 2400, '30 packs'],
    'pys-merged-001-05': [90, 'per pack', 2160, '24 packs'],
    'pys-merged-001-06': [80, 'per pack', 3840, '48 packs'],
    'pys-merged-002-01': [100, ''],
    'pys-pdf-02-02': [480, 'per bundle', 4800],
    'pys-pdf-02-03': [null, '', 4800],
    'ayyanar-62-05': [450, 'per unit', 10200],
    'ayyanar-62-06': [450, 'per unit', 10200],
    'ayyanar-63-01': [480, 'per unit', 10900],
    'ayyanar-63-02': [450, 'per unit', 10200],
    'ayyanar-63-03': [450, 'per unit', 10200],
    'ayyanar-63-04': [450, 'per unit', 10200],
    'ayyanar-64-05': [140, 'per unit', 21800],
    'ayyanar-64-06': [530, 'per unit', 20600],
  }
  if (prices[slug]) return prices[slug]
  if (/^ayyanar-(57|58)-0[1-6]$/.test(slug)) return [80, 'per unit', 6300]
  if (slug === 'ayyanar-59-02' || slug === 'ayyanar-61-04') return undefined
  if (/^ayyanar-(59|60|61|62)-0[1-4]$|^ayyanar-(59|61)-0[56]$/.test(slug)) {
    return [260, 'per unit', 6000]
  }
  if (/^ayyanar-63-0[56]$|^ayyanar-64-0[1-4]$/.test(slug)) return [550, 'per unit', 16000]
}
