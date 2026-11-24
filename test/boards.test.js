import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { resolveConfig } from '../src/config.js'
import { belongsToBoard, boardTerms } from '../src/data/boardPolicy.js'
import { preorderCatalogue } from '../src/data/preorderCatalogue.js'
import { buildWholesaleCatalogue, wholesaleCatalogue } from '../src/data/wholesaleCatalogue.js'

test('wholesale keeps the full shared catalogue and photos while bulk terms are pending', () => {
  assert.equal(wholesaleCatalogue.length, preorderCatalogue.length)
  assert.equal(new Set(wholesaleCatalogue.map(product => product.id)).size, wholesaleCatalogue.length)
  for (let i = 0; i < wholesaleCatalogue.length; i++) {
    const product = wholesaleCatalogue[i]
    assert.equal(product.title, preorderCatalogue[i].title)
    assert.equal(product.dept, preorderCatalogue[i].dept)
    assert.deepEqual(product.images, preorderCatalogue[i].images)
    assert.ok(product.images.length)
    assert.equal(belongsToBoard(product, 'wholesale'), true)
    assert.equal(belongsToBoard(product, 'preorder'), false)
    const terms = boardTerms(product, 'wholesale')
    assert.equal(terms.pricingPending, true)
    assert.equal(terms.price, null)
    assert.equal(terms.minimum, null)
    assert.equal(product.in_stock, false)
    assert.equal(product.preorder, undefined)
  }
})

test('default wholesale reads website and supplier listings together', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wholesale-website-'))
  try {
    const dataDir = path.join(dir, 'src/lib/data')
    fs.mkdirSync(dataDir, { recursive: true })
    const supplier = preorderCatalogue[0]
    const websiteProduct = {
      slug: 'website-only',
      title: 'Website-only test rice',
      dept: 'pantry',
      price: 200,
      in_stock: true,
      purchasable: false,
      variants: [{ id: 'standard', image: '/assets/img/test-rice.jpg' }],
    }
    fs.writeFileSync(path.join(dataDir, 'products.json'), JSON.stringify([
      websiteProduct,
      { ...websiteProduct, slug: 'duplicate', title: supplier.title },
      { ...websiteProduct, slug: 'hidden', tags: ['catalogue:hidden-pos-group'] },
    ]))

    const env = { ...process.env, BOT_MODE: 'wholesale', DEEPGLOBAL_PATH: dir }
    delete env.WHOLESALE_PRODUCTS_JSON_PATH
    delete env.PRODUCTS_JSON_PATH
    execFileSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict'
      import { listProducts, getProductBySlug } from './src/data/deepgmart.js'
      const listings = listProducts()
      assert.equal(listings.length, ${preorderCatalogue.length + 1})
      assert.equal(listings.filter(p => p.title === ${JSON.stringify(supplier.title)}).length, 1)
      const website = getProductBySlug('wholesale-website-website-only')
      assert.equal(website.imageRelative, '/assets/img/test-rice.jpg')
      assert.equal(website.pricingPending, true)
      assert.equal(website.price_cents, null)
      assert.equal(website.minimum, null)
      assert.equal(website.available, false)
    `], { env })
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('wholesale merges duplicate retail cards and preserves known distinct pack sizes', () => {
  const image = ['/assets/img/product.jpg']
  const catalogue = buildWholesaleCatalogue([
    { slug: 'orange', title: '100 Plus Orange', images: image },
    { slug: 'orange-2', title: '100 Plus Orange', images: image },
    { slug: 'almond-100-gm', title: 'Premium California Raw Almonds', images: image },
    { slug: 'almond-250gm', title: 'Premium California Raw Almonds', images: image },
  ]).filter(product => product.slug.startsWith('wholesale-website-'))
  assert.deepEqual(catalogue.map(product => product.title), [
    '100 Plus Orange',
    'Premium California Raw Almonds — 100 g',
    'Premium California Raw Almonds — 250 g',
  ])
})

test('matched supplier prices become pre-order offers for the printed selling unit', () => {
  const babyWipes = preorderCatalogue.find(product => product.slug === 'preorder-supplier-pys-merged-001-05')
  assert.equal(babyWipes.preorder.accepting_orders, true)
  assert.equal(babyWipes.preorder.unit, 'pack')
  assert.equal(boardTerms(babyWipes, 'preorder').price, 90)
  const disputed = preorderCatalogue.find(product => product.slug === 'preorder-supplier-winthree-9')
  assert.equal(boardTerms(disputed, 'preorder').pricingPending, true)
})

test('named instances have distinct session/state paths and validate configuration', () => {
  const configs = ['normal', 'preorder', 'wholesale'].map(BOT_MODE => resolveConfig({ BOT_MODE }))
  assert.equal(new Set(configs.map(c => c.authDir)).size, 3)
  assert.equal(new Set(configs.map(c => c.stateFile)).size, 3)
  assert.match(resolveConfig({}).authDir, /[\\/]session$/)
  assert.throws(() => resolveConfig({BOT_MODE:'typo'}), /BOT_MODE/)
  assert.throws(() => resolveConfig({BOT_PHONE_NUMBER:'invalid'}), /BOT_PHONE_NUMBER/)
})

test('legacy products are retail only and incomplete special terms fail closed', () => {
  assert.equal(belongsToBoard({}, 'normal'), true)
  assert.equal(belongsToBoard({}, 'preorder'), false)
  assert.equal(boardTerms({}, 'wholesale'), null)
  assert.equal(boardTerms({preorder:{arrival:'December',terms:'Await confirmation',cutoff:'2020-01-01'}}, 'preorder'), null)
})

test('each process filters direct product IDs, search, quantities, state and payment actions', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-bots-'))
  try {
    const products = [
      {slug:'retail',title:'Retail rice',price:200,dept:'rice',in_stock:true,purchasable:true},
      {slug:'bulk',title:'Bulk rice',price:200,dept:'rice',in_stock:true,purchasable:true,stock_board:'wholesale',wholesale:{pack_units:12,min_packs:3,increment:2,price_cents:1800}},
      {slug:'incoming',title:'Incoming rice',price:250,dept:'rice',in_stock:false,purchasable:true,stock_board:'preorder',preorder:{arrival:'December',terms:'Subject to supplier confirmation',accepting_orders:true}},
    ]
    const file = path.join(dir,'products.json')
    fs.writeFileSync(file, JSON.stringify(products))
    for (const mode of ['normal','wholesale','preorder']) {
      execFileSync(process.execPath, ['--input-type=module', '-e', `
        import assert from 'node:assert/strict';
        const {listProducts,getProductBySlug,searchProducts}=await import('./src/data/deepgmart.js');
        const {priceCart,review,pay}=await import('./src/features/shop.js');
        const {getState,setState}=await import('./src/data/shopState.js');
        const expected={normal:'retail',wholesale:'bulk',preorder:'incoming'}[process.env.BOT_MODE];
        assert.equal(listProducts().length,1);
        assert.equal(searchProducts('rice')[0].slug,expected);
        assert.equal(getProductBySlug('prod_'+expected).available,true);
        for(const slug of ['retail','bulk','incoming'].filter(x=>x!==expected)) assert.equal(getProductBySlug('prod_'+slug),null);
        const quantity=process.env.BOT_MODE==='wholesale'?3:1;
        const cart=[{product:'prod_'+expected,variant:null,quantity}];
        if(process.env.BOT_MODE==='wholesale') {
          assert.throws(()=>priceCart([{...cart[0],quantity:2}]),/Minimum/);
          assert.throws(()=>priceCart([{...cart[0],quantity:4}]),/Minimum/);
          assert.equal(priceCart(cart)[0].price,1800);
        }
        setState('same-customer',{cart,step:'browse'});
        const sent=[]; const sock={sendMessage:async(to,msg)=>sent.push(msg)};
        await review(sock,'same-customer','Jane, 10 Test Road, Singapore 123456',{name:'Jane',address:'10 Test Road',postal:'123456'});
        assert.equal(getState('same-customer').order.board,process.env.BOT_MODE);
        if(process.env.BOT_MODE==='wholesale') {
          assert.deepEqual(getState('same-customer').choices,['pay_manual']);
          await assert.rejects(pay(sock,'same-customer','pay_card'),/requests only/);
          await assert.rejects(pay(sock,'same-customer','pay_cod'),/requests only/);
          await pay(sock,'same-customer','pay_manual');
          assert.equal(getState('same-customer').order.status,'awaiting_store_confirmation');
        }
        if(process.env.BOT_MODE==='preorder') {
          assert.deepEqual(getState('same-customer').choices,['pay_card']);
          await assert.rejects(pay(sock,'same-customer','pay_manual'),/advance payment/);
          await assert.rejects(pay(sock,'same-customer','pay_cod'),/advance payment/);
          globalThis.fetch = async (_url, options) => {
            const body = JSON.parse(options.body);
            assert.equal(body.board,'preorder');
            assert.equal(body.expectedTotal,750);
            return Response.json({sessionId:'cs_test_example',total:750,deliveryFee:500,orderNumber:'DG-WA-PRE-example',url:'https://checkout.stripe.com/test',paid:false});
          };
          await pay(sock,'same-customer','pay_card');
          assert.equal(getState('same-customer').order.status,'awaiting_payment');
          assert.equal(getState('same-customer').order.session,'cs_test_example');
        }
      `], { cwd:process.cwd(), env:{...process.env,BOT_MODE:mode,PRODUCTS_JSON_PATH:file,BOT_STATE_PATH:path.join(dir,mode+'.json'),ADMIN_JID:'admin@s.whatsapp.net',BOT_CHECKOUT_SECRET:'x'.repeat(40),ENABLE_COD:'true'}, stdio:'pipe' })
    }
    assert.equal(fs.readdirSync(dir).filter(f=>f.endsWith('.json')).length,4)
  } finally { fs.rmSync(dir,{recursive:true,force:true}) }
})
