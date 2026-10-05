/**
 * DATA SYNC SCRIPT: Recalculate qty_sold for ALL purchase_items
 * 
 * This script syncs qty_sold from actual sale_items and sale_return_items
 * (source of truth) instead of relying on existing qty_sold values.
 * 
 * Run this ONCE to fix all historical data corruption.
 */

const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')
const db = new Database(dbPath)

console.log('\n' + '='.repeat(80))
console.log('🔧 DATA SYNC: Recalculating qty_sold for ALL purchase_items')
console.log('='.repeat(80) + '\n')

// Step 1: Get all purchase_items
console.log('📦 Step 1: Loading all purchase_items...')
const allPurchaseItems = db.prepare(`
  SELECT 
    pi.id,
    pi.product_id,
    pi.qty,
    pi.qty_sold as old_qty_sold,
    p.name as product_name
  FROM purchase_items pi
  JOIN products p ON p.id = pi.product_id
  ORDER BY pi.id ASC
`).all()

console.log(`   Found ${allPurchaseItems.length} purchase items\n`)

// Step 2: Calculate actual qty_sold from sale_items and returns
console.log('📊 Step 2: Calculating actual qty_sold from sales and returns...\n')

const updates = []
const oversold = []

allPurchaseItems.forEach(pi => {
  // Get total sold from sale_items
  const soldData = db.prepare(`
    SELECT COALESCE(SUM(si.qty), 0) as total_sold
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE si.purchase_item_id = ?
      AND s.status != 'voided'
  `).get(pi.id)
  
  // Get total returned from sale_return_items
  const returnData = db.prepare(`
    SELECT COALESCE(SUM(sri.qty), 0) as total_returned
    FROM sale_return_items sri
    WHERE sri.purchase_item_id = ?
  `).get(pi.id)
  
  const actualSold = soldData.total_sold || 0
  const actualReturned = returnData.total_returned || 0
  const newQtySold = actualSold - actualReturned
  
  // Check for drift
  const drift = newQtySold - (pi.old_qty_sold || 0)
  
  if (drift !== 0 || newQtySold > pi.qty) {
    updates.push({
      purchase_item_id: pi.id,
      product_name: pi.product_name,
      qty: pi.qty,
      old_qty_sold: pi.old_qty_sold || 0,
      new_qty_sold: newQtySold,
      drift: drift,
      oversold: newQtySold > pi.qty
    })
    
    if (newQtySold > pi.qty) {
      oversold.push({
        purchase_item_id: pi.id,
        product_name: pi.product_name,
        qty: pi.qty,
        qty_sold: newQtySold,
        excess: newQtySold - pi.qty
      })
    }
  }
})

// Step 3: Report findings
console.log('📋 Step 3: Analysis Results\n')
console.log(`   Total purchase_items checked: ${allPurchaseItems.length}`)
console.log(`   Items needing update: ${updates.length}`)
console.log(`   Items with overselling: ${oversold.length}\n`)

if (updates.length > 0) {
  console.log('🔍 ITEMS WITH QTY_SOLD DRIFT:\n')
  console.log('   Batch ID | Product Name                          | Qty | Old qty_sold | New qty_sold | Drift | Oversold')
  console.log('   ' + '-'.repeat(120))
  
  updates.forEach(u => {
    const name = u.product_name.padEnd(37).substring(0, 37)
    const oversoldFlag = u.oversold ? '⚠️  YES' : '   NO'
    console.log(`   ${u.purchase_item_id.toString().padStart(8)} | ${name} | ${u.qty.toString().padStart(3)} | ${u.old_qty_sold.toString().padStart(12)} | ${u.new_qty_sold.toString().padStart(12)} | ${u.drift.toString().padStart(5)} | ${oversoldFlag}`)
  })
  console.log()
}

if (oversold.length > 0) {
  console.log('⚠️  CRITICAL: OVERSOLD BATCHES (qty_sold > qty):\n')
  console.log('   Batch ID | Product Name                          | Qty | qty_sold | Excess')
  console.log('   ' + '-'.repeat(100))
  
  oversold.forEach(o => {
    const name = o.product_name.padEnd(37).substring(0, 37)
    console.log(`   ${o.purchase_item_id.toString().padStart(8)} | ${name} | ${o.qty.toString().padStart(3)} | ${o.qty_sold.toString().padStart(8)} | ${o.excess.toString().padStart(6)}`)
  })
  console.log()
}

// Step 4: Prompt for confirmation
console.log('='.repeat(80))
console.log('⚠️  READY TO SYNC')
console.log('='.repeat(80))
console.log('\nThis script will UPDATE qty_sold for all purchase_items based on actual sales.')
console.log('\nNOTE: Oversold batches will remain oversold (negative stock) until fixed manually.')
console.log('      This sync only corrects qty_sold to match actual sales, it does NOT')
console.log('      redistribute sales to different batches.\n')

console.log('To execute the sync, run:')
console.log('  node fix-qty-sold-sync.js --execute\n')

// Step 5: Execute if --execute flag provided
if (process.argv.includes('--execute')) {
  console.log('🚀 EXECUTING SYNC...\n')
  
  const syncTransaction = db.transaction(() => {
    let updateCount = 0
    
    allPurchaseItems.forEach(pi => {
      // Recalculate from scratch
      const soldData = db.prepare(`
        SELECT COALESCE(SUM(si.qty), 0) as total_sold
        FROM sale_items si
        JOIN sales s ON s.id = si.sale_id
        WHERE si.purchase_item_id = ?
          AND s.status != 'voided'
      `).get(pi.id)
      
      const returnData = db.prepare(`
        SELECT COALESCE(SUM(sri.qty), 0) as total_returned
        FROM sale_return_items sri
        WHERE sri.purchase_item_id = ?
      `).get(pi.id)
      
      const newQtySold = (soldData.total_sold || 0) - (returnData.total_returned || 0)
      
      // Update
      db.prepare(`
        UPDATE purchase_items 
        SET qty_sold = ?
        WHERE id = ?
      `).run(newQtySold, pi.id)
      
      updateCount++
    })
    
    console.log(`   ✅ Updated ${updateCount} purchase_items`)
  })
  
  syncTransaction()
  
  console.log('\n✅ SYNC COMPLETE!\n')
  console.log('Next steps:')
  console.log('  1. Review oversold batches listed above')
  console.log('  2. Implement frontend and backend validations')
  console.log('  3. Test with fresh sales to ensure no new corruption\n')
} else {
  console.log('📝 DRY RUN COMPLETE - No changes made to database\n')
}

console.log('='.repeat(80) + '\n')

db.close()
