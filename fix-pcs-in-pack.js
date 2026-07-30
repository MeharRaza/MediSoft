// Quick fix: Update pcs_in_pack in products table from purchase_items data
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')
const db = new Database(dbPath)

console.log('🔧 Fixing pcs_in_pack values in products table...')

// Get all products
const products = db.prepare('SELECT id, name, pcs_in_pack FROM products').all()

console.log(`📦 Found ${products.length} products`)

products.forEach(product => {
  // Get the most recent purchase entry for this product
  const latestPurchase = db.prepare(`
    SELECT pi.pcs_in_pack 
    FROM purchase_items pi 
    JOIN purchases pu ON pu.id = pi.purchase_id
    WHERE pi.product_id = ?
    ORDER BY pu.created_at DESC
    LIMIT 1
  `).get(product.id)
  
  if (latestPurchase && latestPurchase.pcs_in_pack && latestPurchase.pcs_in_pack !== product.pcs_in_pack) {
    console.log(`  ✏️ Updating ${product.name}: ${product.pcs_in_pack} → ${latestPurchase.pcs_in_pack}`)
    db.prepare('UPDATE products SET pcs_in_pack = ? WHERE id = ?').run(latestPurchase.pcs_in_pack, product.id)
  }
})

console.log('✅ Done! All pcs_in_pack values updated.')

db.close()
