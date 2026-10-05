// Test to check if customer_name is returned in getInvoiceById
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')
const db = new Database(dbPath)

console.log('\n🔍 Testing Invoice Customer Name\n')

// Get latest invoice
const latestInvoice = db.prepare(`
  SELECT s.*, c.name as customer_name 
  FROM sales s
  LEFT JOIN customers c ON c.id = s.customer_id 
  ORDER BY s.id DESC 
  LIMIT 1
`).get()

console.log('Latest Invoice:')
console.log('  ID:', latestInvoice.id)
console.log('  Invoice No:', latestInvoice.invoice_no)
console.log('  Customer ID:', latestInvoice.customer_id)
console.log('  Customer Name:', latestInvoice.customer_name)
console.log('  Created:', latestInvoice.created_at)

// Get customer details
if (latestInvoice.customer_id) {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(latestInvoice.customer_id)
  console.log('\nCustomer Details:')
  console.log('  ID:', customer.id)
  console.log('  Name:', customer.name)
  console.log('  Phone:', customer.phone)
  console.log('  Active:', customer.is_active)
} else {
  console.log('\n⚠️  No customer_id - this is a walk-in sale')
}

db.close()
console.log('\n✅ Test complete\n')
