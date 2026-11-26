import supplierPreview from './supplierPreview.json' with { type: 'json' }
import balajiSupplierPreview from './balajiSupplierPreview.json' with { type: 'json' }
import spmSupplierPreview from './spmSupplierPreview.json' with { type: 'json' }
import extraSupplierPreview from './extraSupplierPreview.json' with { type: 'json' }
import remainingSupplierPreview from './remainingSupplierPreview.json' with { type: 'json' }
import { mergedSupplierPrice } from './mergedSupplierPrices.js'
import winthreePrices from './winthreePrices.json' with { type: 'json' }
import mullaiPrices from './mullaiReferencePrices.json' with { type: 'json' }
import babaPrices from './babaReferencePrices.json' with { type: 'json' }
import matchedSupplierOffers from './matchedSupplierOffers.json' with { type: 'json' }

// November supplier list. Values here are supplier SGD prices.
// Columns: product | unit | quantity:price tiers | optional supplier conditions.
const november = `
Sapporo Pints 330ml|carton|1:58
Jim Beam Black Cherry 700ml|bottle|1:35,6:33
Jim Beam Peach 700ml|bottle|1:35,6:33
Saero Soju Zero Sugar Original|bottle|1:7.25
Saero Soju Lychee|bottle|1:6.75
Saero Soju Apricot|bottle|1:6.75
Saero Soju Kiwi|bottle|1:6.75
Roku Noryo Green Tea|bottle|1:50,6:49,12:48
Carlsberg Green Tab 490ml|carton|1:70|Supplier lists one Dewar 750ml with 10 cartons.
Leo Beer 320ml 24 cans|carton|1:42
Leo Beer 490ml 12 cans|carton|1:31.50
Singha Beer 320ml 24 cans|carton|1:44
Singha Soda Water|carton|1:13.50,5:12.50|Confirm carton size with the store.
Asahi 350ml|carton|1:73.20,5:62.50|Supplier lists 24 cans per carton at the five-carton tier.
Asahi 500ml|carton|1:109.20,5:85|Supplier lists 24 cans per carton at the five-carton tier.
Absolut Vodka 700ml|bottle|1:38,6:37,12:36
Absolut Vodka 350ml|bottle|1:23,6:22.50,12:22
Absolut Vodka 200ml|bottle|1:14,6:13.50,12:13
Absolut Flavour Mix 700ml|bottle|1:41,6:40|Confirm flavours with the store.
Ballantine's Finest 350ml|bottle|1:23
Ballantine's Finest 750ml|bottle|1:40,6:38,12:38|Supplier lists a Dewar 750ml with 12 bottles.
Black & White 700ml|bottle|1:35,12:34
Black & White 375ml|bottle|1:19.50,24:19
Black & White 200ml|bottle|1:11.50,48:11
Bacardi Lemon 700ml|bottle|1:34,6:33,12:32|Supplier lists one Bacardi 200ml with 12 bottles.
Bacardi 700ml|bottle|1:33,6:32.50,12:32
Bacardi 350ml|bottle|1:19,6:18.50,12:18
Bacardi 200ml|bottle|1:11,12:11.38|Supplier lists one free piece at the 12-bottle tier.
Bombay Sapphire 700ml|bottle|1:42,6:41,12:40
Benedictine DOM 750ml Boxed|bottle|1:50.50,6:50,12:49
Benedictine DOM 700ml Unboxed|bottle|1:48,6:45
Chivas Regal 18 Year 700ml|bottle|1:80,6:76,12:75|Supplier lists a Dewar 750ml with 12 bottles.
Chivas Regal 12 Year 700ml|bottle|1:44,6:43,12:42,24:41.50|The 24-bottle promotion requires cash before delivery. Confirm terms with the store.
Chivas Regal 12 Year 375ml|bottle|1:29
Chivas Regal 12 Year 200ml|bottle|1:19
Chivas Regal 12 Year 1000ml|bottle|1:58.50
Chivas Regal 12 Year 4500ml with Cradle|bottle|1:398
Chivas Royal Salute 21 Year|bottle|1:150,3:145,6:140
Dewar's White Label 700ml|bottle|1:34.50,12:34,24:34|Supplier lists four Jägermeister 4cl bottles at 24 bottles.
Dewar's White Label 375ml|bottle|1:20.50,24:20
Dewar's White Label 200ml|bottle|1:11.50,48:11,96:10.50
Famous Grouse 700ml|bottle|1:36,6:35,12:34|Supplier lists three mugs at 6 bottles and six mugs at 12 bottles.
Famous Grouse 350ml|bottle|1:22
Famous Grouse 200ml|bottle|1:14.50
Grant's Triple Wood 700ml|bottle|1:34,6:33
Grant's Triple Wood 350ml|bottle|1:19
Grant's Triple Wood 200ml|bottle|1:10.30
Grey Goose|bottle|1:52,6:51,12:50
Grey Goose 200ml|bottle|1:20
Glenfiddich 12 Year|bottle|1:64,6:62,12:60
Glenfiddich 15 Year|bottle|1:96,6:88
Glenlivet 12 Year|bottle|1:72,6:60
Glenlivet 15 Year|bottle|1:100,6:95
Glenlivet 18 Year|bottle|1:140,6:128
Gordon's Gin 700ml|bottle|1:33,12:32.50
Gordon's Gin 350ml|bottle|1:19,24:19|Supplier lists Dewar's 200ml at 24 bottles.
Gordon's Gin 200ml|bottle|1:11.40
Hendrick's Gin|bottle|1:60,6:66|Supplier lists a Hendrick's 700ml at 6 bottles.
Hennessy VSOP|bottle|1:78,6:75,12:72
Hennessy VS|bottle|1:62
High Commissioner 700ml|bottle|1:30
High Commissioner 350ml|bottle|1:16.50
High Commissioner 200ml|bottle|1:10
Jägermeister|bottle|1:36,6:33
Jägermeister 4cl|bottle|1:4.80
Jim Beam 700ml|bottle|1:36,6:35,12:34
Jim Beam 200ml|bottle|1:12|Supplier lists this item as out of stock.|closed
Jim Beam Honey / Apple|bottle|1:35,6:32|Six-bottle mix. Confirm flavour selection with the store.
Jim Beam Black 700ml|bottle|1:45,6:42
Johnnie Walker Black Label|bottle|1:44,6:43,12:42,24:42|Supplier lists four Jägermeister 4cl bottles at 24 bottles.
Johnnie Walker Black Label 375ml|bottle|1:26
Johnnie Walker Black Label 200ml|bottle|1:15
Johnnie Walker Red Label|bottle|1:35,12:33.50
Johnnie Walker Red Label 375ml|bottle|1:20.50
Johnnie Walker Red Label 200ml|bottle|1:11.20
Johnnie Walker Red Label 1000ml|bottle|1:50
Johnnie Walker Double Black|bottle|1:58,6:53
Johnnie Walker Gold Label 700ml|bottle|1:66,6:60,12:57
Johnnie Walker Gold Label 750ml|bottle|1:72,6:66,12:63
Jameson|bottle|1:45,6:40,12:39
Jack Daniel's 700ml|bottle|1:45,6:44,12:43,24:42
Jack Daniel's 375ml|bottle|1:25.50
Jack Daniel's 200ml|bottle|1:14.50
Jacob's Creek Wine 750ml|bottle|1:19,6:18,12:17|Mixed bottles at quantity tiers. Confirm selection with the store.
Jacob's Creek Wine 187ml|bottle|1:6.50,24:6
Martell Cordon Bleu 700ml ISP|bottle|1:190,6:185,12:180
Martell Cordon Bleu 700ml Unboxed Agent|bottle|1:215,6:198
Martell Cordon Bleu 1000ml|bottle|1:240,6:220,12:211
Martell VSOP 700ml Unboxed Agent|bottle|1:77,6:73,12:70,24:69
Martell VSOP 700ml ISP|bottle|1:76,6:72,12:68
Martell VSOP 1000ml|bottle|1:98
Monkey Shoulder 700ml|bottle|1:52,12:48,24:46|Supplier lists six coasters with 24 bottles.
Monkey Shoulder 200ml|bottle|1:19.50,6:18.50
Old Monk Rum 750ml|bottle|1:36,6:34,12:32.50
Old Monk Rum 350ml|bottle|1:18
Old Monk Rum 200ml|bottle|1:8
Roku Gin 700ml|bottle|1:48,6:47,12:46
Roku Gin 200ml|bottle|1:20
Rémy Martin VSOP 700ml|bottle|1:65,6:66,12:65
St-Rémy VSOP 700ml|bottle|1:38,6:36,12:35
St-Rémy XO|bottle|1:42
Singleton 12 Year|bottle|1:50,6:47,12:46
Suntory Toki 700ml|bottle|1:56,6:52
Smirnoff 700ml|bottle|1:32,12:31.50
Smirnoff 350ml|bottle|1:19
Smirnoff 200ml|bottle|1:11.40,12:11
Teacher's 700ml|bottle|1:34,6:33,12:32
Teacher's 200ml|bottle|1:11
`

// Use the listed regular carton prices. October-only discounts and rebates are excluded.
const cartons = `
490ml Cans|Tiger:72.20,Tiger Crystal:73.70,Heineken:83.20,Guinness:128.78,ABC:125.04,Anchor Smooth:67.36,Anchor Strong:81.90,Kingfisher:82.80,Kalyani:80.90,Kalyani Red Label:69.90,Bullet:63.14,Baron:119.36,Kirin:90.80
440ml Cans|GDIC:107.72,Kilkenny:138.24
320ml Cans|Tiger:46.70,Tiger Crystal:47.77,Tiger Radler:36.90,Heineken:55,Heineken Silver:74.88,Anchor Smooth:40.19,Guinness:76.08,ABC:71.28,Baron:74.64,Edelweiss:70.80,Heineken 0.0:30.80,Kirin:66.48
330ml Pints|Heineken 0.0:36.92,Kirin Ichiban:88.32
633ml Quarts|Tiger:71.04,Heineken:85.32,Guinness:89.40,Anchor:53.28,ABC:76.80,Baron:75.84
500ml|SNOW Brave The World:29.40,Erdinger:75.84
650ml Paper Carton|Kingfisher Extra Strong:55.80,Kalyani Black Label:57.48
`

const markupCents = 500

// Product photos reused from the DeepGmart catalogue, keyed by pre-order slug.
const photos = {
  'kalyani-red-label-490ml-cans': '/assets/img/preorder/kalyani-red-label-490ml-cans.webp',

  'saero-soju-zero-sugar-original': '/assets/img/preorder/saero-soju-zero-sugar-original.webp',
  'saero-soju-lychee': '/assets/img/preorder/saero-soju-lychee.webp',
  'saero-soju-apricot': '/assets/img/preorder/saero-soju-apricot.webp',
  'saero-soju-kiwi': '/assets/img/preorder/saero-soju-kiwi.webp',
  'leo-beer-320ml-24-cans': '/assets/img/preorder/leo-beer-320ml-24-cans.webp',
  'leo-beer-490ml-12-cans': '/assets/img/preorder/leo-beer-490ml-12-cans.webp',
  'singha-beer-320ml-24-cans': '/assets/img/preorder/singha-beer-320ml-24-cans.webp',
  'singha-soda-water': '/assets/img/preorder/singha-soda-water.webp',
  'sapporo-pints-330ml': 'prod_929fa4ae12c4.jpg',
  'jim-beam-black-cherry-700ml': '/assets/img/preorder/jim-beam-black-cherry-700ml.jpg',
  'jim-beam-peach-700ml': '/assets/img/preorder/jim-beam-peach-700ml.jpg',
  'roku-noryo-green-tea': '/assets/img/preorder/roku-noryo-green-tea.webp',
  'carlsberg-green-tab-490ml': 'off_fdda39a62ff7fa04.jpg',
  'asahi-350ml': 'prod_5e391a9b929c.jpg',
  'absolut-vodka-350ml': 'off_6769e778eda93b54.jpg',
  'bacardi-lemon-700ml': 'prod_c9501b8aadb9.jpg',
  'bacardi-700ml': 'prod_db2879f7a3f3.jpg',
  'bacardi-350ml': 'off_c2d69f321db0d620.jpg',
  'chivas-regal-18-year-700ml': 'off_e5ce51a8ed396e9f.jpg',
  'chivas-regal-12-year-700ml': 'prod_a60c6128ebdd.jpg',
  'chivas-regal-12-year-200ml': 'prod_1ba634364d95.jpg',
  'dewar-s-white-label-700ml': 'prod_8fce3f52229f.jpg',
  'dewar-s-white-label-375ml': 'prod_5a0fe3e6f82e.jpg',
  'grant-s-triple-wood-700ml': 'prod_c274103f6e0a.jpg',
  'glenfiddich-12-year': 'prod_ff98526b2ceb.jpg',
  'glenfiddich-15-year': 'prod_4ecff35a8d62.jpg',
  'johnnie-walker-black-label-375ml': 'prod_8c55021fdd27.jpg',
  'johnnie-walker-black-label-200ml': 'prod_727d8b2786e7.jpg',
  'johnnie-walker-red-label': 'prod_207a3b363a0c.jpg',
  'johnnie-walker-red-label-375ml': 'prod_c177818f13cd.jpg',
  'johnnie-walker-red-label-200ml': 'prod_ba44a30cd1ee.jpg',
  'johnnie-walker-double-black': 'prod_ff15c6f5aea6.jpg',
  'johnnie-walker-gold-label-700ml': 'off_44536ffa3c343e48.jpg',
  'jack-daniel-s-200ml': 'off_f7ad54282392849c.jpg',
  'monkey-shoulder-700ml': 'off_adc4499621477e1c.jpg',
  'old-monk-rum-200ml': 'prod_de4010137db6.jpg',
  'old-monk-rum-750ml': '/assets/img/preorder/old-monk-rum-750ml.jpg',
  'roku-gin-700ml': 'prod_7840b330a6d2.jpg',
  'singleton-12-year': 'prod_adad5aaf1805.jpg',
  'suntory-toki-700ml': 'prod_f2211f4fd65a.jpg',
  'smirnoff-350ml': 'off_1069872e1c1ddcd5.jpg',
  'smirnoff-200ml': 'off_d7aabe079e6d1e82.jpg',
  'teacher-s-700ml': 'prod_ce225ca81156.jpg',
  'teacher-s-200ml': 'prod_13c1726ae70d.jpg',
  'tiger-490ml-cans': 'prod_d85ad3385d82.jpg',
  'anchor-strong-490ml-cans': 'prod_182442e5edd3.jpg',
  'gdic-440ml-cans': 'prod_2dc66ccab4d6.jpg',
  'anchor-smooth-320ml-cans': 'off_bd1690a56f0850bf.jpg',
  'guinness-320ml-cans': 'off_708028a90443c151.jpg',
  'heineken-633ml-quarts': 'prod_54904f6cc4ec.jpg',
}

// Internet photo matches, reviewed against the supplier product list.
Object.assign(photos, {
  "asahi-350ml": "/assets/img/preorder/asahi-350ml.webp",
  "asahi-500ml": "/assets/img/preorder/asahi-500ml.webp",
  "absolut-vodka-700ml": "/assets/img/preorder/absolut-vodka-700ml.webp",
  "absolut-vodka-350ml": "/assets/img/preorder/absolut-vodka-350ml.webp",
  "absolut-vodka-200ml": "/assets/img/preorder/absolut-vodka-200ml.webp",
  "absolut-flavour-mix-700ml": "/assets/img/preorder/absolut-flavour-mix-700ml.webp",
  "ballantine-s-finest-350ml": "/assets/img/preorder/ballantine-s-finest-350ml.webp",
  "ballantine-s-finest-750ml": "/assets/img/preorder/ballantine-s-finest-750ml.webp",
  "black-white-700ml": "/assets/img/preorder/black-white-700ml.webp",
  "black-white-375ml": "/assets/img/preorder/black-white-375ml.webp",
  "black-white-200ml": "/assets/img/preorder/black-white-200ml.webp",
  "bacardi-200ml": "/assets/img/preorder/bacardi-200ml.webp",
  "bombay-sapphire-700ml": "/assets/img/preorder/bombay-sapphire-700ml.webp",
  "benedictine-dom-750ml-boxed": "/assets/img/preorder/benedictine-dom-750ml-boxed.webp",
  "benedictine-dom-700ml-unboxed": "/assets/img/preorder/benedictine-dom-700ml-unboxed.webp",
  "chivas-regal-12-year-375ml": "/assets/img/preorder/chivas-regal-12-year-375ml.webp",
  "chivas-regal-12-year-1000ml": "/assets/img/preorder/chivas-regal-12-year-1000ml.webp",
  "chivas-regal-12-year-4500ml-with-cradle": "/assets/img/preorder/chivas-regal-12-year-4500ml-with-cradle.webp",
  "chivas-royal-salute-21-year": "/assets/img/preorder/chivas-royal-salute-21-year.webp",
  "dewar-s-white-label-200ml": "/assets/img/preorder/dewar-s-white-label-200ml.webp",
  "famous-grouse-700ml": "/assets/img/preorder/famous-grouse-700ml.webp",
  "famous-grouse-350ml": "/assets/img/preorder/famous-grouse-350ml.webp",
  "famous-grouse-200ml": "/assets/img/preorder/famous-grouse-200ml.webp",
  "grant-s-triple-wood-350ml": "/assets/img/preorder/grant-s-triple-wood-350ml.webp",
  "grant-s-triple-wood-200ml": "/assets/img/preorder/grant-s-triple-wood-200ml.webp",
  "grey-goose": "/assets/img/preorder/grey-goose.webp",
  "grey-goose-200ml": "/assets/img/preorder/grey-goose-200ml.webp",
  "glenlivet-12-year": "/assets/img/preorder/glenlivet-12-year.webp",
  "glenlivet-15-year": "/assets/img/preorder/glenlivet-15-year.webp",
  "glenlivet-18-year": "/assets/img/preorder/glenlivet-18-year.webp",
  "gordon-s-gin-700ml": "/assets/img/preorder/gordon-s-gin-700ml.webp",
  "gordon-s-gin-350ml": "/assets/img/preorder/gordon-s-gin-350ml.webp",
  "gordon-s-gin-200ml": "/assets/img/preorder/gordon-s-gin-200ml.webp",
  "hendrick-s-gin": "/assets/img/preorder/hendrick-s-gin.webp",
  "hennessy-vsop": "/assets/img/preorder/hennessy-vsop.webp",
  "hennessy-vs": "/assets/img/preorder/hennessy-vs.webp",
  "high-commissioner-700ml": "/assets/img/preorder/high-commissioner-700ml.webp",
  "high-commissioner-350ml": "/assets/img/preorder/high-commissioner-350ml.webp",
  "high-commissioner-200ml": "/assets/img/preorder/high-commissioner-200ml.webp",
  "jagermeister": "/assets/img/preorder/jagermeister.webp",
  "jagermeister-4cl": "/assets/img/preorder/jagermeister-4cl.webp",
  "jim-beam-700ml": "/assets/img/preorder/jim-beam-700ml.webp",
  "jim-beam-200ml": "/assets/img/preorder/jim-beam-200ml.webp",
  "jim-beam-honey-apple": "/assets/img/preorder/jim-beam-honey-apple.webp",
  "jim-beam-black-700ml": "/assets/img/preorder/jim-beam-black-700ml.webp",
  "johnnie-walker-black-label": "/assets/img/preorder/johnnie-walker-black-label.webp",
  "johnnie-walker-red-label-1000ml": "/assets/img/preorder/johnnie-walker-red-label-1000ml.webp",
  "johnnie-walker-gold-label-750ml": "/assets/img/preorder/johnnie-walker-gold-label-750ml.webp",
  "jameson": "/assets/img/preorder/jameson.webp",
  "jack-daniel-s-700ml": "/assets/img/preorder/jack-daniel-s-700ml.webp",
  "jack-daniel-s-375ml": "/assets/img/preorder/jack-daniel-s-375ml.webp",
  "jacob-s-creek-wine-750ml": "/assets/img/preorder/jacob-s-creek-wine-750ml.webp",
  "jacob-s-creek-wine-187ml": "/assets/img/preorder/jacob-s-creek-wine-187ml.webp",
  "martell-cordon-bleu-700ml-isp": "/assets/img/preorder/martell-cordon-bleu-700ml-isp.webp",
  "martell-cordon-bleu-700ml-unboxed-agent": "/assets/img/preorder/martell-cordon-bleu-700ml-unboxed-agent.webp",
  "martell-cordon-bleu-1000ml": "/assets/img/preorder/martell-cordon-bleu-1000ml.webp",
  "martell-vsop-700ml-unboxed-agent": "/assets/img/preorder/martell-vsop-700ml-unboxed-agent.webp",
  "martell-vsop-700ml-isp": "/assets/img/preorder/martell-vsop-700ml-isp.webp",
  "martell-vsop-1000ml": "/assets/img/preorder/martell-vsop-1000ml.webp",
  "monkey-shoulder-200ml": "/assets/img/preorder/monkey-shoulder-200ml.webp",
  "old-monk-rum-350ml": "/assets/img/preorder/old-monk-rum-350ml.webp",
  "roku-gin-200ml": "/assets/img/preorder/roku-gin-200ml.webp",
  "remy-martin-vsop-700ml": "/assets/img/preorder/remy-martin-vsop-700ml.webp",
  "st-remy-vsop-700ml": "/assets/img/preorder/st-remy-vsop-700ml.webp",
  "st-remy-xo": "/assets/img/preorder/st-remy-xo.webp",
  "smirnoff-700ml": "/assets/img/preorder/smirnoff-700ml.webp",
  "tiger-crystal-490ml-cans": "/assets/img/preorder/tiger-crystal-490ml-cans.webp",
  "heineken-490ml-cans": "/assets/img/preorder/heineken-490ml-cans.webp",
  "guinness-490ml-cans": "/assets/img/preorder/guinness-490ml-cans.webp",
  "abc-490ml-cans": "/assets/img/preorder/abc-490ml-cans.webp",
  "anchor-smooth-490ml-cans": "/assets/img/preorder/anchor-smooth-490ml-cans.webp",
  "kingfisher-490ml-cans": "/assets/img/preorder/kingfisher-490ml-cans.webp",
  "kalyani-490ml-cans": "/assets/img/preorder/kalyani-490ml-cans.webp",
  "bullet-490ml-cans": "/assets/img/preorder/bullet-490ml-cans.webp",
  "baron-490ml-cans": "/assets/img/preorder/baron-490ml-cans.webp",
  "kirin-490ml-cans": "/assets/img/preorder/kirin-490ml-cans.webp",
  "kilkenny-440ml-cans": "/assets/img/preorder/kilkenny-440ml-cans.webp",
  "tiger-320ml-cans": "/assets/img/preorder/tiger-320ml-cans.webp",
  "tiger-crystal-320ml-cans": "/assets/img/preorder/tiger-crystal-320ml-cans.webp",
  "tiger-radler-320ml-cans": "/assets/img/preorder/tiger-radler-320ml-cans.webp",
  "heineken-320ml-cans": "/assets/img/preorder/heineken-320ml-cans.webp",
  "heineken-silver-320ml-cans": "/assets/img/preorder/heineken-silver-320ml-cans.webp",
  "abc-320ml-cans": "/assets/img/preorder/abc-320ml-cans.webp",
  "baron-320ml-cans": "/assets/img/preorder/baron-320ml-cans.webp",
  "edelweiss-320ml-cans": "/assets/img/preorder/edelweiss-320ml-cans.webp",
  "heineken-0-0-320ml-cans": "/assets/img/preorder/heineken-0-0-320ml-cans.webp",
  "kirin-320ml-cans": "/assets/img/preorder/kirin-320ml-cans.webp",
  "heineken-0-0-330ml-pints": "/assets/img/preorder/heineken-0-0-330ml-pints.webp",
  "kirin-ichiban-330ml-pints": "/assets/img/preorder/kirin-ichiban-330ml-pints.webp",
  "tiger-633ml-quarts": "/assets/img/preorder/tiger-633ml-quarts.webp",
  "guinness-633ml-quarts": "/assets/img/preorder/guinness-633ml-quarts.webp",
  "anchor-633ml-quarts": "/assets/img/preorder/anchor-633ml-quarts.webp",
  "abc-633ml-quarts": "/assets/img/preorder/abc-633ml-quarts.webp",
  "baron-633ml-quarts": "/assets/img/preorder/baron-633ml-quarts.webp",
  "snow-brave-the-world-500ml": "/assets/img/preorder/snow-brave-the-world-500ml.webp",
  "erdinger-500ml": "/assets/img/preorder/erdinger-500ml.webp",
  "kingfisher-extra-strong-650ml-paper-carton": "/assets/img/preorder/kingfisher-extra-strong-650ml-paper-carton.webp",
  "kalyani-black-label-650ml-paper-carton": "/assets/img/preorder/kalyani-black-label-650ml-paper-carton.webp"
})

function offer(title, unit, tiers, notes = '', status) {
  const slug = title.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')
  const priceTiers = tiers.split(',').map(tier => {
    const [quantity, supplierPrice] = tier.split(':')
    return { quantity: Number(quantity), price: Math.round(Number(supplierPrice) * 100) + markupCents }
  })
  return {
    id: `preorder-${slug}`,
    slug: `preorder-${slug}`,
    title,
    dept: /soda water|heineken 0\.0/i.test(title) ? 'beverages' : 'liquor',
    stock_board: 'preorder',
    price: priceTiers[0].price,
    images: photos[slug] ? [photos[slug].startsWith('/') ? photos[slug] : `/assets/img/products/${photos[slug]}`] : [],
    purchasable: true,
    in_stock: false,
    preorder: {
      arrival: 'Allow 7–10 days for delivery after store confirmation',
      accepting_orders: status !== 'closed',
      unit,
      priceTiers,
      terms: [`Quantity is counted per ${unit}.`, notes, 'Prices and supplier offers are subject to store confirmation.'].filter(Boolean).join(' '),
    },
  }
}

const supplierListings = new Map()
for (const product of [...supplierPreview, ...spmSupplierPreview, ...extraSupplierPreview, ...remainingSupplierPreview, ...balajiSupplierPreview]) {
  const key = product.title.normalize('NFKD').toLowerCase()
    .replace(/(?<=\d)\s*(?:gms?|gr)\b/g, 'g')
    .replace(/(?<=\d)\s*ltrs?\b/g, 'l')
    .replace(/[^a-z0-9]/g, '')
  // The Dashmesh photo shows the same Everest 1 kg pouch already listed by SPM.
  const identity = product.slug === 'dashmesh-101-06' ? 'everestturmericpowderpouch1kg' : key
  const existing = supplierListings.get(identity)
  if (existing) {
    existing.sources.push(...product.sources)
  } else {
    supplierListings.set(identity, { ...product, sources: [...product.sources] })
  }
}

function supplierOffer(slug) {
  if (Object.hasOwn(matchedSupplierOffers, slug)) return matchedSupplierOffers[slug]
  const row = /^winthree-(\d+)$/.exec(slug)
  const winthree = row && winthreePrices.find(price => price.row === Number(row[1]))
  if (winthree) return winthree.totalsAgree
    ? { price: winthree.unit, unit: /\bCAN\b/i.test(winthree.name) ? 'can' : 'bottle' }
    : null

  const [price, label] = mergedSupplierPrice(slug) || mullaiPrices[slug] || babaPrices[slug] || []
  const unit = /^per ([^,]+)/.exec(label || '')?.[1]
  return Number.isSafeInteger(price) && price > 0 && unit ? { price, unit } : null
}

function supplierProduct(product) {
  const slug = `preorder-supplier-${product.slug}`
  const offer = supplierOffer(product.slug)
  return {
    ...product,
    ...(offer?.retailSize ? { title: `${product.title} — ${offer.retailSize}` } : {}),
    id: slug,
    slug,
    stock_board: 'preorder',
    purchasable: true,
    ...(offer ? { price: offer.price } : {}),
    preorder: offer ? {
      accepting_orders: true,
      arrival: 'Allow 7–10 days for delivery after store confirmation',
      unit: offer.unit,
      ...(offer.pack ? { pack: offer.pack } : {}),
      priceTiers: [{ quantity: 1, price: offer.price }, ...(offer.quantityPrices || [])],
      terms: [`Selling unit: ${offer.unit}.`, offer.pack && `${offer.pack}.`, 'Advance payment required.'].filter(Boolean).join(' '),
    } : { pricing_pending: true },
  }
}

export const preorderCatalogue = [
  ...Array.from(supplierListings.values(), supplierProduct),
  ...november.trim().split('\n').map(row => offer(...row.split('|'))),
  ...cartons.trim().split('\n').flatMap(row => {
    const [size, items] = row.split('|')
    return items.split(',').map(item => {
      const [name, price] = item.split(':')
      const deposit = size.includes('Quarts') || name.startsWith('SNOW') ? ' Bottle deposit included.' : ''
      return offer(`${name} ${size}`, 'carton', `1:${price}`, `Carton price before 9% GST. BCRS deposit excluded.${deposit} Store confirms the current price.`)
    })
  }),
]
