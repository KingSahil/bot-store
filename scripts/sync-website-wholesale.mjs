import fs from 'node:fs'
import path from 'node:path'
import { buildWholesaleCatalogue } from '../src/data/wholesaleCatalogue.js'

const site = process.env.DEEPGLOBAL_PATH || 'C:/Projects/deepglobal'
const dataPath = path.join(site, 'src/lib/data')
const website = JSON.parse(fs.readFileSync(path.join(dataPath, 'products.json'), 'utf8'))
const catalogue = buildWholesaleCatalogue(website)
const rows = catalogue.map(product => {
  const photo = product.images.find(image => fs.existsSync(path.join(site, 'public', image)))
  if (!photo) throw new Error(`Missing wholesale photo for ${product.title}`)
  return { slug: product.slug, title: product.title, category: product.dept || 'other', photo }
})
if (new Set(rows.map(product => product.slug)).size !== rows.length) throw new Error('Duplicate wholesale slugs')
rows.sort((a, b) => a.title.localeCompare(b.title))
const destination = path.join(dataPath, 'wholesale.json')
fs.writeFileSync(destination + '.tmp', JSON.stringify(rows, null, 2) + '\n')
fs.renameSync(destination + '.tmp', destination)
console.log(`Synced ${rows.length} supplier and website listings to DeepGmart Wholesale`)
