// Use Electron's database connection directly
const { ipcMain } = require('electron')
const db = require('./electron/database')

console.log('\n🔍 CHECKING BISLERI STOCK ISSUE\n')
console.log('='.repeat(80))

// 1. Find Bisleri
const product = db.prepare(`
  SELECT id, name, pcs_in_pack 
  FROM products 
  WHERE LOWER(name) LIKE '%bisleri%'
`).get()

console.log('1️⃣ PRODUCT:', product)

// 2. Purchase Items
const purchases = db.prepare(`
  SELECT 
    pi.id,
    pi.qty,
    pi.qty_sold,
    (pi.qty - IFNULL(pi.qty_sold, 0)) as remaining,
    pi.expiry_date,
    pu.invoice_no,
    pu.created_at
  FROM purchase_items pi
  JOIN purchases pu ON pu.id = pi.purchase_id
  WHERE pi.product_id = ?
`).all(product.id)

console.log('\n2️⃣ PURCHASE ITEMS:')
purchases.forEach(p => {
  console.log(`   ID: ${p.id}, Qty: ${p.qty}, Sold: ${p.qty_sold || 0}, Remaining: ${p.remaining}`)
})

let totalPurchased = 0
let totalSold = 0
purchases.forEach(p => {
  totalPurchased += p.qty
  totalSold += (p.qty_sold || 0)
})

console.log(`\n   Total Purchased: ${totalPurchased}`)
console.log(`   Total qty_sold: ${totalSold}`)
console.log(`   Calculated Stock: ${totalPurchased - totalSold}`)

// 3. Sale Items
const sales = db.prepare(`
  SELECT 
    si.id,
    si.qty,
    si.purchase_item_id,
    s.invoice_no,
    s.status
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE si.product_id = ?
`).all(product.id)

console.log('\n3️⃣ SALE ITEMS:')
let actualSold = 0
sales.forEach(s => {
  console.log(`   Invoice: ${s.invoice_no}, Qty: ${s.qty}, Purchase Item: ${s.purchase_item_id}, Status: ${s.status}`)
  if (s.status !== 'voided') {
    actualSold += s.qty
  }
})

console.log(`\n   Actual Sold (from sales): ${actualSold}`)

// 4. Returns
const returns = db.prepare(`
  SELECT 
    sri.qty,
    sr.created_at
  FROM sale_return_items sri
  JOIN sale_returns sr ON sr.id = sri.return_id
  WHERE sri.product_id = ?
`).all(product.id)

let totalReturns = 0
if (returns.length > 0) {
  console.log('\n4️⃣ RETURNS:')
  returns.forEach(r => {
    console.log(`   Returned: ${r.qty}`)
    totalReturns += r.qty
  })
  console.log(`   Total Returns: ${totalReturns}`)
}

console.log('\n' + '='.repeat(80))
console.log('📊 FINAL ANALYSIS:')
console.log('='.repeat(80))
console.log(`Purchased: ${totalPurchased}`)
console.log(`Sold (from sale_items): ${actualSold}`)
console.log(`Returned: ${totalReturns}`)
console.log(`\nExpected Stock: ${totalPurchased} - ${actualSold} + ${totalReturns} = ${totalPurchased - actualSold + totalReturns}`)
console.log(`\nqty_sold total in purchase_items: ${totalSold}`)
console.log(`Calculated Stock (using qty_sold): ${totalPurchased - totalSold}`)

if ((actualSold - totalReturns) !== totalSold) {
  console.log(`\n🐛 ISSUE FOUND: qty_sold (${totalSold}) does NOT match actual sales (${actualSold - totalReturns})`)
  console.log(`   Difference: ${Math.abs((actualSold - totalReturns) - totalSold)}`)
} else {
  console.log(`\n✅ qty_sold is correct`)
}

console.log('\n' + '='.repeat(80))
