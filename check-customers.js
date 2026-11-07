const Database = require('better-sqlite3')
const db = new Database('./data/medisoft.db')

const customers = db.prepare('SELECT id, name, phone, address FROM customers ORDER BY name').all()
console.log('Total customers:', customers.length)
console.log('\nFirst 10 customers:')
customers.slice(0, 10).forEach(c => {
  console.log(`  - ${c.name} (ID: ${c.id})`)
})

const ali = customers.filter(c => c.name.toLowerCase().includes('ali'))
console.log('\n\nCustomers with "ali":')
if (ali.length > 0) {
  ali.forEach(c => {
    console.log(`  - ${c.name} (ID: ${c.id}, Phone: ${c.phone})`)
  })
} else {
  console.log('  None found')
}

db.close()
