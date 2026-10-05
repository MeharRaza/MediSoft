// Test script to verify profit calculation fix
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')
const db = new Database(dbPath)

console.log('\n=== 🔍 DEBUGGING PROFIT CALCULATION ===\n')

// 1. Check if migration ran
console.log('1️⃣ Checking sale_return_items table schema...')
const columns = db.prepare('PRAGMA table_info(sale_return_items)').all()
const hasPurchaseItemId = columns.some(c => c.name === 'purchase_item_id')
console.log('   Columns:', columns.map(c => c.name).join(', '))
console.log('   ✅ Has purchase_item_id?', hasPurchaseItemId ? 'YES' : 'NO ❌')

// 2. Check today's sales
const today = new Date().toISOString().split('T')[0]
console.log(`\n2️⃣ Today's sales (${today}):`)
const sales = db.prepare(`
  SELECT s.id, s.invoice_no, s.grand_total, s.created_at,
    (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as items_count
  FROM sales s 
  WHERE date(s.created_at) = ?
`).all(today)
console.log(`   Found ${sales.length} sales today`)
sales.forEach(s => {
  console.log(`   - ${s.invoice_no}: Rs. ${s.grand_total}, Items: ${s.items_count}`)
})

// 3. Check today's returns
console.log(`\n3️⃣ Today's returns (${today}):`)
const returns = db.prepare(`
  SELECT sr.id, sr.sale_id, sr.total, sr.created_at,
    (SELECT COUNT(*) FROM sale_return_items WHERE return_id = sr.id) as items_count
  FROM sale_returns sr 
  WHERE date(sr.created_at) = ?
`).all(today)
console.log(`   Found ${returns.length} returns today`)
returns.forEach(r => {
  console.log(`   - Return #${r.id} (Sale #${r.sale_id}): Rs. ${r.total}, Items: ${r.items_count}`)
})

// 4. Check return items and their purchase_item_id
if (returns.length > 0) {
  console.log(`\n4️⃣ Return items details:`)
  returns.forEach(r => {
    const items = db.prepare(`
      SELECT sri.*, p.name as product_name
      FROM sale_return_items sri
      JOIN products p ON p.id = sri.product_id
      WHERE sri.return_id = ?
    `).all(r.id)
    
    console.log(`\n   Return #${r.id}:`)
    items.forEach(item => {
      console.log(`   - ${item.product_name}: Qty ${item.qty}, Price ${item.price}`)
      console.log(`     purchase_item_id: ${item.purchase_item_id || 'NULL ❌'}`)
    })
  })
}

// 5. Calculate profit manually
console.log(`\n5️⃣ Manual Profit Calculation:`)

// Sold COGS
const soldCogs = db.prepare(`
  SELECT COALESCE(SUM(si.qty * COALESCE((pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END),0)),0) as t
  FROM sale_items si 
  JOIN sales s ON s.id=si.sale_id 
  LEFT JOIN purchase_items pi ON pi.id=si.purchase_item_id
  WHERE date(s.created_at) = ? AND s.status!='voided'
`).get(today).t

console.log(`   Sold COGS: Rs. ${soldCogs.toFixed(2)}`)

// Returned COGS
const returnedCogs = db.prepare(`
  SELECT COALESCE(SUM(sri.qty * COALESCE((pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END),0)),0) as t
  FROM sale_return_items sri
  JOIN sale_returns sr ON sr.id=sri.return_id
  LEFT JOIN purchase_items pi ON pi.id=sri.purchase_item_id
  WHERE date(sr.created_at) = ?
`).get(today).t

console.log(`   Returned COGS: Rs. ${returnedCogs.toFixed(2)}`)
console.log(`   Net COGS: Rs. ${(soldCogs - returnedCogs).toFixed(2)}`)

// Check if any return items are missing purchase_item_id
const missingLinks = db.prepare(`
  SELECT COUNT(*) as cnt
  FROM sale_return_items sri
  JOIN sale_returns sr ON sr.id=sri.return_id
  WHERE date(sr.created_at) = ? AND sri.purchase_item_id IS NULL
`).get(today).cnt

if (missingLinks > 0) {
  console.log(`\n   ⚠️ WARNING: ${missingLinks} return items have NULL purchase_item_id!`)
  console.log(`   This means returned COGS cannot be calculated for these items.`)
}

// 6. Show detailed breakdown for each return item
if (returns.length > 0) {
  console.log(`\n6️⃣ Detailed COGS breakdown for returned items:`)
  
  const returnItemsWithCogs = db.prepare(`
    SELECT 
      sri.return_id,
      sri.product_id,
      p.name as product_name,
      sri.qty,
      sri.price as sale_price,
      sri.purchase_item_id,
      pi.purchase_price,
      pi.pcs_in_pack,
      (pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END) as per_piece_cost,
      (sri.qty * (pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END)) as item_cogs
    FROM sale_return_items sri
    JOIN sale_returns sr ON sr.id=sri.return_id
    JOIN products p ON p.id=sri.product_id
    LEFT JOIN purchase_items pi ON pi.id=sri.purchase_item_id
    WHERE date(sr.created_at) = ?
  `).all(today)
  
  returnItemsWithCogs.forEach(item => {
    console.log(`\n   ${item.product_name}:`)
    console.log(`   - Qty: ${item.qty}`)
    console.log(`   - Sale Price: Rs. ${item.sale_price}`)
    console.log(`   - Purchase Item ID: ${item.purchase_item_id || 'NULL ❌'}`)
    if (item.purchase_item_id) {
      console.log(`   - Purchase Price (pack): Rs. ${item.purchase_price}`)
      console.log(`   - Pcs in Pack: ${item.pcs_in_pack}`)
      console.log(`   - Per Piece Cost: Rs. ${item.per_piece_cost?.toFixed(2)}`)
      console.log(`   - Item COGS: Rs. ${item.item_cogs?.toFixed(2)} ✅`)
    } else {
      console.log(`   - ❌ Cannot calculate COGS - purchase_item_id is NULL`)
    }
  })
}

console.log('\n=== END ===\n')

db.close()
