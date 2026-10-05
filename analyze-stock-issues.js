const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')
const db = new Database(dbPath)

console.log('='.repeat(80))
console.log('STOCK ANALYSIS - Finding Discrepancies')
console.log('='.repeat(80))
console.log()

// Get all products with stock
const products = db.prepare(`
  SELECT 
    p.id,
    p.name,
    p.pcs_in_pack
  FROM products p
  WHERE p.is_active = 1
  ORDER BY p.name
`).all()

console.log(`Total Active Products: ${products.length}\n`)

const issues = []

products.forEach(product => {
  // 1. Total Purchased
  const purchased = db.prepare(`
    SELECT COALESCE(SUM(pi.qty), 0) as total
    FROM purchase_items pi
    WHERE pi.product_id = ?
  `).get(product.id)
  
  // 2. Total Sold (from actual sales)
  const sold = db.prepare(`
    SELECT COALESCE(SUM(si.qty), 0) as total
    FROM sale_items si
    JOIN sales s ON s.id = si.sale_id
    WHERE si.product_id = ? AND s.status != 'voided'
  `).get(product.id)
  
  // 3. Total Returned
  const returned = db.prepare(`
    SELECT COALESCE(SUM(sri.qty), 0) as total
    FROM sale_return_items sri
    WHERE sri.product_id = ?
  `).get(product.id)
  
  // 4. Stock using qty_sold column
  const stockFromQtySold = db.prepare(`
    SELECT COALESCE(SUM(pi.qty - pi.qty_sold), 0) as total
    FROM purchase_items pi
    WHERE pi.product_id = ?
  `).get(product.id)
  
  // 5. Stock using qty_sold with filter
  const stockWithFilter = db.prepare(`
    SELECT COALESCE(SUM(pi.qty - pi.qty_sold), 0) as total
    FROM purchase_items pi
    WHERE pi.product_id = ?
    AND pi.qty > pi.qty_sold
  `).get(product.id)
  
  // 6. Expected stock (Purchase - Sold + Returned)
  const expectedStock = purchased.total - sold.total + returned.total
  
  // 7. Check for oversold batches
  const oversoldBatches = db.prepare(`
    SELECT COUNT(*) as count
    FROM purchase_items pi
    WHERE pi.product_id = ?
    AND pi.qty_sold > pi.qty
  `).get(product.id)
  
  // Calculate discrepancies
  const discrepancy1 = expectedStock - stockFromQtySold.total
  const discrepancy2 = stockFromQtySold.total - stockWithFilter.total
  
  // Only report if there's activity and discrepancy
  if (purchased.total > 0 && (Math.abs(discrepancy1) > 0 || Math.abs(discrepancy2) > 0)) {
    issues.push({
      id: product.id,
      name: product.name,
      purchased: purchased.total,
      sold: sold.total,
      returned: returned.total,
      expectedStock: expectedStock,
      stockFromQtySold: stockFromQtySold.total,
      stockWithFilter: stockWithFilter.total,
      discrepancy1: discrepancy1,
      discrepancy2: discrepancy2,
      oversoldBatches: oversoldBatches.count
    })
  }
})

// Sort by highest discrepancy
issues.sort((a, b) => Math.abs(b.discrepancy1) - Math.abs(a.discrepancy1))

console.log(`\nProducts with Stock Issues: ${issues.length}\n`)
console.log('='.repeat(80))

if (issues.length > 0) {
  console.log('Top 20 Products with Discrepancies:\n')
  
  issues.slice(0, 20).forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.name}`)
    console.log(`   Purchased: ${item.purchased} pills`)
    console.log(`   Sold: ${item.sold} pills`)
    console.log(`   Returned: ${item.returned} pills`)
    console.log(`   Expected Stock: ${item.expectedStock} pills`)
    console.log(`   Stock (from qty_sold): ${item.stockFromQtySold} pills`)
    console.log(`   Stock (with filter): ${item.stockWithFilter} pills`)
    console.log(`   Discrepancy (Expected vs qty_sold): ${item.discrepancy1}`)
    console.log(`   Discrepancy (Filter impact): ${item.discrepancy2}`)
    console.log(`   Oversold Batches: ${item.oversoldBatches}`)
    console.log()
  })
  
  console.log('='.repeat(80))
  console.log('\nSUMMARY:\n')
  
  const totalWithDiscrepancy1 = issues.filter(i => Math.abs(i.discrepancy1) > 0).length
  const totalWithDiscrepancy2 = issues.filter(i => Math.abs(i.discrepancy2) > 0).length
  const totalWithOversold = issues.filter(i => i.oversoldBatches > 0).length
  
  console.log(`Products with qty_sold discrepancy: ${totalWithDiscrepancy1}`)
  console.log(`Products affected by filter: ${totalWithDiscrepancy2}`)
  console.log(`Products with oversold batches: ${totalWithOversold}`)
  
  console.log('\n' + '='.repeat(80))
} else {
  console.log('✅ No stock discrepancies found! All data is consistent.')
}

db.close()
