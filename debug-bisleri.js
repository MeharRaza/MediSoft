const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')
const db = new Database(dbPath)

console.log('\n🔍 DEBUGGING BISLERI STOCK CALCULATION\n')
console.log('=' .repeat(80))

// 1. Find Bisleri product
console.log('\n1️⃣ FINDING BISLERI PRODUCT:')
const product = db.prepare(`
  SELECT id, name, pcs_in_pack 
  FROM products 
  WHERE LOWER(name) LIKE '%bisleri%'
`).get()

if (!product) {
  console.log('❌ Bisleri product not found!')
  process.exit(1)
}

console.log(`   Product ID: ${product.id}`)
console.log(`   Product Name: ${product.name}`)
console.log(`   Pcs in Pack: ${product.pcs_in_pack}`)

// 2. Check Purchase Items (all entries)
console.log('\n2️⃣ PURCHASE HISTORY:')
const purchaseItems = db.prepare(`
  SELECT 
    pi.id,
    pi.purchase_id,
    pi.qty,
    pi.qty_sold,
    (pi.qty - pi.qty_sold) as remaining,
    pi.expiry_date,
    pi.purchase_price,
    pi.sale_price,
    pu.invoice_no,
    pu.created_at
  FROM purchase_items pi
  JOIN purchases pu ON pu.id = pi.purchase_id
  WHERE pi.product_id = ?
  ORDER BY pu.created_at ASC
`).all(product.id)

console.log(`   Total Purchase Entries: ${purchaseItems.length}`)
let totalPurchased = 0
let totalSold = 0
let totalRemaining = 0

purchaseItems.forEach((item, index) => {
  console.log(`\n   Entry ${index + 1}:`)
  console.log(`     Purchase Item ID: ${item.id}`)
  console.log(`     Invoice: ${item.invoice_no}`)
  console.log(`     Date: ${item.created_at}`)
  console.log(`     Expiry: ${item.expiry_date}`)
  console.log(`     Qty Purchased: ${item.qty}`)
  console.log(`     Qty Sold: ${item.qty_sold || 0}`)
  console.log(`     Remaining: ${item.remaining}`)
  
  totalPurchased += item.qty
  totalSold += (item.qty_sold || 0)
  totalRemaining += item.remaining
})

console.log(`\n   📊 SUMMARY:`)
console.log(`     Total Purchased: ${totalPurchased}`)
console.log(`     Total Sold (qty_sold): ${totalSold}`)
console.log(`     Total Remaining: ${totalRemaining}`)
console.log(`     Expected Stock: ${totalPurchased - totalSold}`)

// 3. Check Sale Items (verify actual sales)
console.log('\n3️⃣ SALES HISTORY:')
const salesItems = db.prepare(`
  SELECT 
    si.id,
    si.sale_id,
    si.qty,
    si.purchase_item_id,
    s.invoice_no,
    s.created_at,
    s.status
  FROM sale_items si
  JOIN sales s ON s.id = si.sale_id
  WHERE si.product_id = ?
  ORDER BY s.created_at ASC
`).all(product.id)

console.log(`   Total Sale Entries: ${salesItems.length}`)
let totalSalesQty = 0

salesItems.forEach((item, index) => {
  console.log(`\n   Sale ${index + 1}:`)
  console.log(`     Sale Item ID: ${item.id}`)
  console.log(`     Invoice: ${item.invoice_no}`)
  console.log(`     Date: ${item.created_at}`)
  console.log(`     Status: ${item.status}`)
  console.log(`     Qty Sold: ${item.qty}`)
  console.log(`     Purchase Item ID: ${item.purchase_item_id || 'NULL'}`)
  
  if (item.status !== 'voided') {
    totalSalesQty += item.qty
  }
})

console.log(`\n   📊 TOTAL QTY SOLD (from sale_items): ${totalSalesQty}`)

// 4. Check Returns
console.log('\n4️⃣ RETURNS HISTORY:')
const returnItems = db.prepare(`
  SELECT 
    sri.id,
    sri.return_id,
    sri.qty,
    sri.purchase_item_id,
    sr.created_at
  FROM sale_return_items sri
  JOIN sale_returns sr ON sr.id = sri.return_id
  WHERE sri.product_id = ?
  ORDER BY sr.created_at ASC
`).all(product.id)

console.log(`   Total Return Entries: ${returnItems.length}`)
let totalReturnQty = 0

if (returnItems.length > 0) {
  returnItems.forEach((item, index) => {
    console.log(`\n   Return ${index + 1}:`)
    console.log(`     Return Item ID: ${item.id}`)
    console.log(`     Date: ${item.created_at}`)
    console.log(`     Qty Returned: ${item.qty}`)
    console.log(`     Purchase Item ID: ${item.purchase_item_id || 'NULL'}`)
    
    totalReturnQty += item.qty
  })
  console.log(`\n   📊 TOTAL QTY RETURNED: ${totalReturnQty}`)
} else {
  console.log(`   No returns found`)
}

// 5. Final Calculation
console.log('\n' + '='.repeat(80))
console.log('5️⃣ FINAL ANALYSIS:')
console.log('='.repeat(80))
console.log(`\n   Purchased: ${totalPurchased}`)
console.log(`   Sold: ${totalSalesQty}`)
console.log(`   Returned: ${totalReturnQty}`)
console.log(`   Expected Stock: ${totalPurchased} - ${totalSalesQty} + ${totalReturnQty} = ${totalPurchased - totalSalesQty + totalReturnQty}`)
console.log(`\n   Database Calculation (SUM(qty - qty_sold)): ${totalRemaining}`)
console.log(`\n   ❌ DISCREPANCY: ${Math.abs((totalPurchased - totalSalesQty + totalReturnQty) - totalRemaining)} pills`)

// 6. Check if qty_sold matches actual sales
console.log('\n6️⃣ VERIFYING QTY_SOLD UPDATES:')
const mismatch = totalSalesQty - totalReturnQty !== totalSold
if (mismatch) {
  console.log(`   ⚠️ MISMATCH DETECTED!`)
  console.log(`   qty_sold in purchase_items: ${totalSold}`)
  console.log(`   Actual sales from sale_items: ${totalSalesQty}`)
  console.log(`   Returns: ${totalReturnQty}`)
  console.log(`   Expected qty_sold: ${totalSalesQty - totalReturnQty}`)
  console.log(`\n   🐛 ROOT CAUSE: qty_sold is not being updated correctly!`)
} else {
  console.log(`   ✅ qty_sold matches actual sales`)
}

console.log('\n' + '='.repeat(80))
console.log('🏁 DEBUG COMPLETE')
console.log('='.repeat(80) + '\n')

db.close()
