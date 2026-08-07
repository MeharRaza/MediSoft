const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')
const db = new Database(dbPath)

console.log('Checking deleted products...\n')

// Check products that are is_active=0
const deleted = db.prepare(`
  SELECT id, name, is_active 
  FROM products 
  WHERE is_active = 0
`).all()

console.log(`Found ${deleted.length} deleted products (is_active=0):`)
deleted.forEach(p => {
  console.log(`  - ID: ${p.id}, Name: ${p.name}, is_active: ${p.is_active}`)
})

console.log('\n---\n')

// Check test5 product specifically
const test5 = db.prepare(`
  SELECT p.id, p.name, p.is_active,
         (SELECT SUM(pi.qty - pi.qty_sold) 
          FROM purchase_items pi 
          WHERE pi.product_id = p.id AND pi.qty > pi.qty_sold
         ) as stock,
         (SELECT pi.id FROM purchase_items pi 
          WHERE pi.product_id = p.id 
          AND pi.qty > pi.qty_sold
          ORDER BY pi.id ASC LIMIT 1
         ) as current_purchase_item_id
  FROM products p
  WHERE LOWER(p.name) LIKE '%test5%'
`).all()

console.log('test5 product details:')
test5.forEach(p => {
  console.log(`  ID: ${p.id}`)
  console.log(`  Name: ${p.name}`)
  console.log(`  is_active: ${p.is_active}`)
  console.log(`  stock: ${p.stock}`)
  console.log(`  current_purchase_item_id: ${p.current_purchase_item_id}`)
  
  // Get purchase items for this product
  const purchases = db.prepare(`
    SELECT pi.id, pi.qty, pi.qty_sold, (pi.qty - pi.qty_sold) as remaining
    FROM purchase_items pi
    WHERE pi.product_id = ?
    ORDER BY pi.id
  `).all(p.id)
  
  console.log(`  Purchase items:`)
  purchases.forEach(pi => {
    console.log(`    - PI ID: ${pi.id}, qty: ${pi.qty}, sold: ${pi.qty_sold}, remaining: ${pi.remaining}`)
  })
})

db.close()
