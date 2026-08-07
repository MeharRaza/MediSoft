// Reset database for fresh testing
// This will be run through Electron IPC

const db = require('./electron/database');

console.log('\n🗑️  RESETTING DATABASE FOR FRESH TESTING\n');

const today = new Date().toISOString().split('T')[0];

try {
  // 1. Delete all Nims purchase items
  console.log('📦 Deleting all Nims purchase items...');
  const nimsProduct = db.prepare(`SELECT id FROM products WHERE name LIKE '%nims%'`).all();
  const nimsIds = nimsProduct.map(p => p.id).join(',');
  
  if (nimsIds) {
    const deletedPurchaseItems = db.prepare(`
      DELETE FROM purchase_items 
      WHERE product_id IN (${nimsIds})
    `).run();
    console.log(`   ✅ Deleted ${deletedPurchaseItems.changes} purchase_items`);
  }
  
  // 2. Delete today's sales
  console.log('\n💰 Deleting today\'s sales...');
  const todaySales = db.prepare(`
    SELECT id FROM sales WHERE date(created_at) = ?
  `).all(today);
  
  const saleIds = todaySales.map(s => s.id).join(',');
  
  if (saleIds) {
    // Delete sale items first
    const deletedSaleItems = db.prepare(`
      DELETE FROM sale_items WHERE sale_id IN (${saleIds})
    `).run();
    console.log(`   ✅ Deleted ${deletedSaleItems.changes} sale_items`);
    
    // Delete sales
    const deletedSales = db.prepare(`
      DELETE FROM sales WHERE id IN (${saleIds})
    `).run();
    console.log(`   ✅ Deleted ${deletedSales.changes} sales`);
  }
  
  // 3. Delete today's returns
  console.log('\n🔄 Deleting today\'s returns...');
  const todayReturns = db.prepare(`
    SELECT id FROM sale_returns WHERE date(created_at) = ?
  `).all(today);
  
  const returnIds = todayReturns.map(r => r.id).join(',');
  
  if (returnIds) {
    const deletedReturnItems = db.prepare(`
      DELETE FROM sale_return_items WHERE return_id IN (${returnIds})
    `).run();
    console.log(`   ✅ Deleted ${deletedReturnItems.changes} return_items`);
    
    const deletedReturns = db.prepare(`
      DELETE FROM sale_returns WHERE id IN (${returnIds})
    `).run();
    console.log(`   ✅ Deleted ${deletedReturns.changes} returns`);
  }
  
  // 4. Delete today's purchases
  console.log('\n🛒 Deleting today\'s purchases...');
  const todayPurchases = db.prepare(`
    SELECT id FROM purchases WHERE date(created_at) = ?
  `).all(today);
  
  const purchaseIds = todayPurchases.map(p => p.id).join(',');
  
  if (purchaseIds) {
    const deletedPurchases = db.prepare(`
      DELETE FROM purchases WHERE id IN (${purchaseIds})
    `).run();
    console.log(`   ✅ Deleted ${deletedPurchases.changes} purchases`);
  }
  
  console.log('\n✅ DATABASE RESET COMPLETE! Ready for fresh testing.\n');
  
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
}
