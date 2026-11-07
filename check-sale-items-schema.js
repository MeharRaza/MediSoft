const Database = require('better-sqlite3')
const db = new Database('./data/medisoft.db')

// Check table schema
const schema = db.prepare("PRAGMA table_info(sale_items)").all()
console.log('sale_items table columns:')
schema.forEach(col => {
  console.log(`  - ${col.name} (${col.type})`)
})

// Check a recent sale
const recentSale = db.prepare(`
  SELECT si.*, p.name as product_name 
  FROM sale_items si 
  JOIN products p ON p.id = si.product_id 
  ORDER BY si.id DESC 
  LIMIT 3
`).all()

console.log('\nRecent sale items:')
recentSale.forEach(item => {
  console.log(`  - ${item.product_name}: qty=${item.qty}, price=${item.sale_price}, discount_percent=${item.discount_percent}, total=${item.total}`)
})

db.close()
