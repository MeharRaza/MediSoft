// Direct SQL to add purchase_item_id column
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const dbPath = path.join(__dirname, 'data', 'medisoft.db')

if (!fs.existsSync(dbPath)) {
  console.error('❌ Database not found:', dbPath)
  process.exit(1)
}

const db = new Database(dbPath)

console.log('📂 Database:', dbPath)
console.log('\n🔍 Checking sale_return_items table...')

// Check current columns
const columns = db.prepare('PRAGMA table_info(sale_return_items)').all()
console.log('Current columns:', columns.map(c => c.name).join(', '))

const hasPurchaseItemId = columns.some(c => c.name === 'purchase_item_id')

if (hasPurchaseItemId) {
  console.log('✅ Column purchase_item_id already exists!')
} else {
  console.log('⚠️  Column purchase_item_id NOT found - adding now...')
  try {
    db.exec(`ALTER TABLE sale_return_items ADD COLUMN purchase_item_id INTEGER REFERENCES purchase_items(id);`)
    console.log('✅ Column added successfully!')
    
    // Verify
    const newColumns = db.prepare('PRAGMA table_info(sale_return_items)').all()
    console.log('New columns:', newColumns.map(c => c.name).join(', '))
  } catch (err) {
    console.error('❌ Error adding column:', err.message)
  }
}

// Check for existing return items without purchase_item_id
const countReturns = db.prepare(`
  SELECT COUNT(*) as cnt FROM sale_return_items WHERE purchase_item_id IS NULL
`).get()

console.log(`\n📊 Return items with NULL purchase_item_id: ${countReturns.cnt}`)

if (countReturns.cnt > 0) {
  console.log('\n⚠️  WARNING: These returns won\'t have accurate profit tracking.')
  console.log('   Recommendation: Create new test returns after this fix.')
}

db.close()
console.log('\n✅ Done!\n')
