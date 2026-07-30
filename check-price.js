const Database = require('better-sqlite3')
const db = new Database('./data/medisoft.db')

console.log('📦 Checking nims product:')
const product = db.prepare(`SELECT id, name, sale_price, trade_price, pcs_in_pack FROM products WHERE name LIKE '%nims%'`).get()
console.log(product)

if (product) {
  console.log('\n💰 Calculated per box price:', product.sale_price * product.pcs_in_pack)
  
  console.log('\n📋 Latest purchase_items entry:')
  const purchaseItem = db.prepare(`
    SELECT pi.id, pi.sale_price, pi.purchase_price, pi.pcs_in_pack
    FROM purchase_items pi
    JOIN purchases pu ON pu.id = pi.purchase_id
    WHERE pi.product_id = ?
    ORDER BY pu.created_at DESC LIMIT 1
  `).get(product.id)
  console.log(purchaseItem)
  
  if (purchaseItem) {
    console.log('\n💰 Per pill from purchase_items:', purchaseItem.sale_price / purchaseItem.pcs_in_pack)
  }
}

db.close()
