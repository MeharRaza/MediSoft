// Direct database cleanup - run with Electron's node
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'medisoft.db');
console.log('Opening database:', dbPath);

const db = Database(dbPath);

console.log('\n🗑️  CLEARING TODAY\'S DATA\n');

const today = new Date().toISOString().split('T')[0];
console.log('Today:', today);

// Count before
const beforeSales = db.prepare('SELECT COUNT(*) as count FROM sales WHERE date(created_at) = ?').get(today);
const beforePurchases = db.prepare('SELECT COUNT(*) as count FROM purchases WHERE date(created_at) = ?').get(today);
console.log(`\nBEFORE: ${beforeSales.count} sales, ${beforePurchases.count} purchases`);

// Delete
const cleanup = db.transaction(() => {
  // Delete sale items first
  const saleItems = db.prepare(`
    DELETE FROM sale_items 
    WHERE sale_id IN (SELECT id FROM sales WHERE date(created_at) = ?)
  `).run(today);
  console.log(`✅ Deleted ${saleItems.changes} sale_items`);
  
  // Delete sales
  const sales = db.prepare('DELETE FROM sales WHERE date(created_at) = ?').run(today);
  console.log(`✅ Deleted ${sales.changes} sales`);
  
  // Delete return items
  const returnItems = db.prepare(`
    DELETE FROM sale_return_items 
    WHERE return_id IN (SELECT id FROM sale_returns WHERE date(created_at) = ?)
  `).run(today);
  console.log(`✅ Deleted ${returnItems.changes} return_items`);
  
  // Delete returns
  const returns = db.prepare('DELETE FROM sale_returns WHERE date(created_at) = ?').run(today);
  console.log(`✅ Deleted ${returns.changes} returns`);
  
  // Delete purchase items
  const purchaseItems = db.prepare(`
    DELETE FROM purchase_items 
    WHERE purchase_id IN (SELECT id FROM purchases WHERE date(created_at) = ?)
  `).run(today);
  console.log(`✅ Deleted ${purchaseItems.changes} purchase_items`);
  
  // Delete purchases
  const purchases = db.prepare('DELETE FROM purchases WHERE date(created_at) = ?').run(today);
  console.log(`✅ Deleted ${purchases.changes} purchases`);
  
  // Reset ALL qty_sold to 0
  const resetQty = db.prepare('UPDATE purchase_items SET qty_sold = 0').run();
  console.log(`✅ Reset qty_sold for ${resetQty.changes} purchase_items`);
});

cleanup();

// Count after
const afterSales = db.prepare('SELECT COUNT(*) as count FROM sales WHERE date(created_at) = ?').get(today);
const afterPurchases = db.prepare('SELECT COUNT(*) as count FROM purchases WHERE date(created_at) = ?').get(today);
console.log(`\nAFTER: ${afterSales.count} sales, ${afterPurchases.count} purchases`);

console.log('\n✅ CLEANUP COMPLETE!\n');

db.close();
