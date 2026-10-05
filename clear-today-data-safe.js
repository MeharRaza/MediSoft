// Safe script to clear today's data for fresh testing
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found:', dbPath)
  process.exit(1)
}

console.log('\n⚠️  WARNING: This will delete ALL today\'s data!')
console.log('📂 Database:', dbPath)
console.log('\nPress Ctrl+C within 3 seconds to cancel...\n')

setTimeout(() => {
  const db = new Database(dbPath)
  
  const today = db.prepare(`SELECT date('now', 'localtime') as today`).get().today
  console.log(`🗑️  Clearing data for: ${today}\n`)
  
  const clear = db.transaction(() => {
    // 1. Get today's sale IDs
    const todaySales = db.prepare(`SELECT id FROM sales WHERE date(created_at) = ?`).all(today)
    const saleIds = todaySales.map(s => s.id)
    
    if (saleIds.length > 0) {
      console.log(`📦 Found ${saleIds.length} sales to delete`)
      
      // Delete sale items first
      const deletedSaleItems = db.prepare(`DELETE FROM sale_items WHERE sale_id IN (${saleIds.join(',')})`).run()
      console.log(`   ✅ Deleted ${deletedSaleItems.changes} sale items`)
      
      // Delete sales
      const deletedSales = db.prepare(`DELETE FROM sales WHERE id IN (${saleIds.join(',')})`).run()
      console.log(`   ✅ Deleted ${deletedSales.changes} sales`)
    } else {
      console.log('📦 No sales found today')
    }
    
    // 2. Get today's return IDs
    const todayReturns = db.prepare(`SELECT id FROM sale_returns WHERE date(created_at) = ?`).all(today)
    const returnIds = todayReturns.map(r => r.id)
    
    if (returnIds.length > 0) {
      console.log(`\n🔄 Found ${returnIds.length} returns to delete`)
      
      // Delete return items first
      const deletedReturnItems = db.prepare(`DELETE FROM sale_return_items WHERE return_id IN (${returnIds.join(',')})`).run()
      console.log(`   ✅ Deleted ${deletedReturnItems.changes} return items`)
      
      // Delete returns
      const deletedReturns = db.prepare(`DELETE FROM sale_returns WHERE id IN (${returnIds.join(',')})`).run()
      console.log(`   ✅ Deleted ${deletedReturns.changes} returns`)
    } else {
      console.log('\n🔄 No returns found today')
    }
    
    // 3. Get today's purchase IDs
    const todayPurchases = db.prepare(`SELECT id FROM purchases WHERE date(created_at) = ?`).all(today)
    const purchaseIds = todayPurchases.map(p => p.id)
    
    if (purchaseIds.length > 0) {
      console.log(`\n🛒 Found ${purchaseIds.length} purchases to delete`)
      
      // Delete purchase items first
      const deletedPurchaseItems = db.prepare(`DELETE FROM purchase_items WHERE purchase_id IN (${purchaseIds.join(',')})`).run()
      console.log(`   ✅ Deleted ${deletedPurchaseItems.changes} purchase items`)
      
      // Delete purchases
      const deletedPurchases = db.prepare(`DELETE FROM purchases WHERE id IN (${purchaseIds.join(',')})`).run()
      console.log(`   ✅ Deleted ${deletedPurchases.changes} purchases`)
    } else {
      console.log('\n🛒 No purchases found today')
    }
    
    console.log('\n✅ ALL TODAY\'S DATA CLEARED!')
    console.log('📊 Dashboard cards should now show zero values for today.\n')
  })
  
  clear()
  db.close()
}, 3000)
