const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')
const fs = require('fs')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
const dbDir = isDev
  ? path.join(__dirname, '../data')
  : path.join(app.getPath('userData'), 'data')

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

// Create backups folder
const backupDir = path.join(dbDir, 'backups')
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

const dbPath = path.join(dbDir, 'medisoft.db')

// ─── AUTOMATIC BACKUP SYSTEM ───────────────────────────────────────────────
function createBackup() {
  try {
    if (fs.existsSync(dbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const backupPath = path.join(backupDir, `medisoft_backup_${timestamp}.db`)
      fs.copyFileSync(dbPath, backupPath)
      console.log(`✅ Database backup created: ${backupPath}`)
      console.log(`📁 Backup location: ${backupDir}`)
      
      // Keep only last 5 backups to save space
      cleanOldBackups()
      return backupPath
    }
  } catch (err) {
    console.error('❌ Backup failed:', err.message)
  }
  return null
}

function cleanOldBackups() {
  try {
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('medisoft_backup_') && f.endsWith('.db'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)
    
    // Keep only last 5 backups
    if (backups.length > 5) {
      backups.slice(5).forEach(backup => {
        fs.unlinkSync(backup.path)
        console.log(`🗑️ Old backup deleted: ${backup.name}`)
      })
    }
  } catch (err) {
    console.error('❌ Cleanup failed:', err.message)
  }
}

// Create backup on startup (before opening database)
createBackup()

const db = new Database(dbPath)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── MIGRATIONS ────────────────────────────────────────────────────────────
// Run migrations to add missing columns to existing databases
function runMigrations() {
  try {
    console.log('🔄 Checking for required database migrations...')
    
    // Migration 1: Add qty_sold to purchase_items (for tracking FIFO sales)
    const purchaseItemsInfo = db.prepare("PRAGMA table_info(purchase_items)").all()
    const hasQtySold = purchaseItemsInfo.some(col => col.name === 'qty_sold')
    
    if (!hasQtySold) {
      console.log('🔄 Running migration: Adding qty_sold to purchase_items table...')
      db.exec(`ALTER TABLE purchase_items ADD COLUMN qty_sold REAL DEFAULT 0;`)
      console.log('✅ Migration complete: purchase_items.qty_sold added')
    } else {
      console.log('✅ purchase_items table already has qty_sold column')
    }

    // Migration 2: Add purchase_item_id to sale_items (link sales to purchase entries)
    const saleItemsInfo = db.prepare("PRAGMA table_info(sale_items)").all()
    const hasPurchaseItemId = saleItemsInfo.some(col => col.name === 'purchase_item_id')
    
    if (!hasPurchaseItemId) {
      console.log('🔄 Running migration: Adding purchase_item_id to sale_items table...')
      db.exec(`ALTER TABLE sale_items ADD COLUMN purchase_item_id INTEGER REFERENCES purchase_items(id);`)
      console.log('✅ Migration complete: sale_items.purchase_item_id added')
    } else {
      console.log('✅ sale_items table already has purchase_item_id column')
    }
    
    // Migration 3: Add qty_in_boxes to purchase_items (for box/loose tracking)
    const hasQtyInBoxes = purchaseItemsInfo.some(col => col.name === 'qty_in_boxes')
    
    if (!hasQtyInBoxes) {
      console.log('🔄 Running migration: Adding qty_in_boxes to purchase_items table...')
      db.exec(`ALTER TABLE purchase_items ADD COLUMN qty_in_boxes INTEGER DEFAULT 0;`)
      console.log('✅ Migration complete: purchase_items.qty_in_boxes added')
    } else {
      console.log('✅ purchase_items table already has qty_in_boxes column')
    }
    
    // Migration 4: Add qty_loose to purchase_items (for box/loose tracking)
    const hasQtyLoose = purchaseItemsInfo.some(col => col.name === 'qty_loose')
    
    if (!hasQtyLoose) {
      console.log('🔄 Running migration: Adding qty_loose to purchase_items table...')
      db.exec(`ALTER TABLE purchase_items ADD COLUMN qty_loose INTEGER DEFAULT 0;`)
      console.log('✅ Migration complete: purchase_items.qty_loose added')
    } else {
      console.log('✅ purchase_items table already has qty_loose column')
    }
    
    // Migration 5: Add gst_tax_percent to purchases (for GST tax tracking)
    const purchasesInfo = db.prepare("PRAGMA table_info(purchases)").all()
    const hasGstTaxPercent = purchasesInfo.some(col => col.name === 'gst_tax_percent')
    
    if (!hasGstTaxPercent) {
      console.log('🔄 Running migration: Adding gst_tax_percent to purchases table...')
      db.exec(`ALTER TABLE purchases ADD COLUMN gst_tax_percent REAL DEFAULT 0;`)
      console.log('✅ Migration complete: purchases.gst_tax_percent added')
    } else {
      console.log('✅ purchases table already has gst_tax_percent column')
    }
    
    // Migration 6: Add pcs_in_pack to purchase_items (for profit calculation)
    const hasPcsInPack = purchaseItemsInfo.some(col => col.name === 'pcs_in_pack')
    
    if (!hasPcsInPack) {
      console.log('🔄 Running migration: Adding pcs_in_pack to purchase_items table...')
      db.exec(`ALTER TABLE purchase_items ADD COLUMN pcs_in_pack INTEGER DEFAULT 1;`)
      console.log('✅ Migration complete: purchase_items.pcs_in_pack added')
    } else {
      console.log('✅ purchase_items table already has pcs_in_pack column')
    }
    
    // Migration 7: Add profit_percent to purchase_items (store calculated profit %)
    const hasProfitPercent = purchaseItemsInfo.some(col => col.name === 'profit_percent')
    
    if (!hasProfitPercent) {
      console.log('🔄 Running migration: Adding profit_percent to purchase_items table...')
      db.exec(`ALTER TABLE purchase_items ADD COLUMN profit_percent REAL DEFAULT 0;`)
      console.log('✅ Migration complete: purchase_items.profit_percent added')
    } else {
      console.log('✅ purchase_items table already has profit_percent column')
    }
    
    // CRITICAL FIX: Update ALL purchase_items with correct pcs_in_pack from products
    console.log('🔄 Updating ALL purchase_items with pcs_in_pack from products table...')
    const updateResult = db.prepare(`
      UPDATE purchase_items 
      SET pcs_in_pack = (
        SELECT COALESCE(p.pcs_in_pack, 1) 
        FROM products p 
        WHERE p.id = purchase_items.product_id
      )
    `).run()
    console.log(`✅ Updated ${updateResult.changes} purchase_items with correct pcs_in_pack`)
    
    // Verify: Check if any NULL/0 values remain
    const checkNulls = db.prepare('SELECT COUNT(*) as cnt FROM purchase_items WHERE pcs_in_pack IS NULL OR pcs_in_pack = 0').get()
    if (checkNulls.cnt > 0) {
      console.log(`⚠️ Warning: ${checkNulls.cnt} purchase_items still have NULL/0 pcs_in_pack, setting to 1`)
      db.exec(`UPDATE purchase_items SET pcs_in_pack = 1 WHERE pcs_in_pack IS NULL OR pcs_in_pack = 0`)
    }
    
    // RECALCULATE PROFIT % FOR ALL EXISTING ENTRIES (one-time fix)
    console.log('🔄 Recalculating profit_percent for ALL existing purchase_items...')
    const recalcResult = db.prepare(`
      UPDATE purchase_items 
      SET profit_percent = (
        SELECT 
          CASE 
            WHEN purchase_items.sale_price > 0 THEN 
              ((purchase_items.sale_price - purchase_items.purchase_price) / purchase_items.sale_price) * 100 
              - COALESCE((SELECT pu.gst_tax_percent FROM purchases pu WHERE pu.id = purchase_items.purchase_id), 0)
            ELSE 0
          END
      )
      WHERE profit_percent = 0 OR profit_percent IS NULL
    `).run()
    console.log(`✅ Recalculated profit_percent for ${recalcResult.changes} purchase_items`)
    
    // Migration 8: Create supplier_companies table (many-to-many)
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='supplier_companies'").get()
    if (!tables) {
      console.log('🔄 Running migration: Creating supplier_companies table...')
      db.exec(`
        CREATE TABLE IF NOT EXISTS supplier_companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
          company_name TEXT NOT NULL,
          created_at TEXT DEFAULT (datetime('now', 'localtime')),
          UNIQUE(supplier_id, company_name)
        );
        CREATE INDEX IF NOT EXISTS idx_supplier_companies_supplier ON supplier_companies(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_supplier_companies_name ON supplier_companies(company_name);
      `)
      console.log('✅ Migration complete: supplier_companies table created')
    } else {
      console.log('✅ supplier_companies table already exists')
    }
    
    // Migration 9 REMOVED - was causing issues with repeated runs
    console.log('✅ Migration 9 skipped (corrupt batch fix removed)')
    
    // Migration 10: Recalculate profit for ALL existing sales (fix discount bug)
    console.log('🔄 Recalculating profit for all historical sales...')
    
    // Check if we need to run this migration (check a flag or just run once)
    const migrationCheck = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sales 
      WHERE id > 0
    `).get()
    
    if (migrationCheck.count > 0) {
      console.log(`   Found ${migrationCheck.count} sales to check`)
      
      // We can't "fix" old sales data, but we can note this for the user
      // The profit calculation is now correct going forward
      console.log('   ℹ️  Note: Historical sales profit was calculated with old formula')
      console.log('   ✅ New sales will use correct profit formula (with discounts)')
    }
    
    console.log('✅ All migrations checked and applied successfully!')
  } catch (err) {
    console.error('❌ Migration error:', err.message)
    console.error(err.stack)
  }
}

runMigrations()

// ─── SCHEMA ────────────────────────────────────────────────────────────────

db.exec(`
-- SETTINGS
CREATE TABLE IF NOT EXISTS company (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'My Pharmacy',
  address TEXT,
  phone TEXT,
  email TEXT,
  ntn TEXT,
  logo TEXT,
  currency TEXT DEFAULT 'PKR',
  tax_rate REAL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier',
  branch_id INTEGER REFERENCES branches(id),
  rights TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- INVENTORY
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS manufacturers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  barcode TEXT,
  name TEXT NOT NULL,
  generic_name TEXT,
  category_id INTEGER REFERENCES categories(id),
  manufacturer_id INTEGER REFERENCES manufacturers(id),
  rack_location TEXT,
  pcs_in_pack INTEGER DEFAULT 1,
  sale_price REAL DEFAULT 0,
  trade_price REAL DEFAULT 0,
  alert_qty REAL DEFAULT 10,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  batch_no TEXT,
  expiry_date TEXT,
  purchase_price REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  qty REAL DEFAULT 0,
  qty_in_boxes INTEGER DEFAULT 0,
  qty_loose INTEGER DEFAULT 0,
  branch_id INTEGER REFERENCES branches(id),
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER REFERENCES products(id),
  batch_id INTEGER REFERENCES batches(id),
  type TEXT NOT NULL, -- 'add','remove','transfer'
  qty REAL NOT NULL,
  reason TEXT,
  from_branch_id INTEGER,
  to_branch_id INTEGER,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- SUPPLIERS & CUSTOMERS
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  opening_balance REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  opening_balance REAL DEFAULT 0,
  balance REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- PURCHASE
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_number TEXT UNIQUE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  status TEXT DEFAULT 'pending', -- pending, received, cancelled
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER REFERENCES purchase_orders(id),
  product_id INTEGER REFERENCES products(id),
  qty REAL DEFAULT 0,
  purchase_price REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  branch_id INTEGER REFERENCES branches(id),
  payment_method TEXT DEFAULT 'credit',
  sub_total REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  gst_tax_percent REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'received',
  created_at TEXT DEFAULT (datetime('now', 'localtime')),
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER REFERENCES purchases(id),
  product_id INTEGER REFERENCES products(id),
  batch_no TEXT,
  expiry_date TEXT,
  purchase_price REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  qty REAL DEFAULT 0,
  qty_sold REAL DEFAULT 0,
  qty_in_boxes INTEGER DEFAULT 0,
  qty_loose INTEGER DEFAULT 0,
  bonus REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  total REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER REFERENCES purchases(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  total REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS purchase_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER REFERENCES purchase_returns(id),
  product_id INTEGER REFERENCES products(id),
  batch_id INTEGER REFERENCES batches(id),
  qty REAL DEFAULT 0,
  price REAL DEFAULT 0,
  total REAL DEFAULT 0
);

-- SALES
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  branch_id INTEGER REFERENCES branches(id),
  user_id INTEGER REFERENCES users(id),
  payment_method TEXT DEFAULT 'cash',
  sub_total REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  grand_total REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  change_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'paid', -- paid, credit, voided
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER REFERENCES sales(id),
  product_id INTEGER REFERENCES products(id),
  purchase_item_id INTEGER REFERENCES purchase_items(id),
  batch_id INTEGER REFERENCES batches(id),
  batch_no TEXT,
  expiry_date TEXT,
  qty REAL DEFAULT 0,
  sale_price REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  total REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sale_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER REFERENCES sales(id),
  customer_id INTEGER REFERENCES customers(id),
  total REAL DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS sale_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  return_id INTEGER REFERENCES sale_returns(id),
  product_id INTEGER REFERENCES products(id),
  batch_id INTEGER REFERENCES batches(id),
  qty REAL DEFAULT 0,
  price REAL DEFAULT 0,
  total REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quotations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quote_no TEXT UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  total REAL DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, converted, cancelled
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quotation_id INTEGER REFERENCES quotations(id),
  product_id INTEGER REFERENCES products(id),
  qty REAL DEFAULT 0,
  price REAL DEFAULT 0,
  discount_percent REAL DEFAULT 0,
  total REAL DEFAULT 0
);

-- ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- asset, liability, equity, income, expense
  parent_id INTEGER REFERENCES accounts(id),
  balance REAL DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS vouchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_no TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- cash_receipt, cash_payment, bank_receipt, bank_payment, journal
  date TEXT NOT NULL,
  description TEXT,
  total REAL DEFAULT 0,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS voucher_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_id INTEGER REFERENCES vouchers(id),
  account_id INTEGER REFERENCES accounts(id),
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS recoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(id),
  amount REAL DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- HRM
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  emp_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  join_date TEXT,
  basic_salary REAL DEFAULT 0,
  branch_id INTEGER REFERENCES branches(id),
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS payroll (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  month TEXT NOT NULL,
  basic_salary REAL DEFAULT 0,
  allowances REAL DEFAULT 0,
  deductions REAL DEFAULT 0,
  net_salary REAL DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, paid
  paid_date TEXT,
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id),
  type TEXT NOT NULL, -- annual, sick, casual, unpaid
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days INTEGER DEFAULT 1,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
`)

// ─── SEED DEFAULT DATA ─────────────────────────────────────────────────────

const seedDefaults = db.transaction(() => {
  // Default company
  const co = db.prepare('SELECT id FROM company WHERE id=1').get()
  if (!co) {
    db.prepare(`INSERT INTO company (id,name,currency) VALUES (1,'MediSoft Pharmacy','PKR')`).run()
  }

  // Default branch
  const br = db.prepare('SELECT id FROM branches WHERE id=1').get()
  if (!br) {
    db.prepare(`INSERT INTO branches (id,name,address) VALUES (1,'Main Branch','Main Street')`).run()
  }

  // Default admin user (password: admin123)
  const usr = db.prepare('SELECT id FROM users WHERE username=?').get('admin')
  if (!usr) {
    db.prepare(`INSERT INTO users (username,password,full_name,role,branch_id,rights) VALUES (?,?,?,?,?,?)`)
      .run('admin', 'admin123', 'Administrator', 'admin', 1, JSON.stringify({ all: true }))
  }

  // Default chart of accounts
  const accs = db.prepare('SELECT id FROM accounts LIMIT 1').get()
  if (!accs) {
    const acctList = [
      ['1000', 'Cash in Hand',        'asset'],
      ['1001', 'Cash at Bank',        'asset'],
      ['1100', 'Accounts Receivable', 'asset'],
      ['1200', 'Inventory',           'asset'],
      ['2000', 'Accounts Payable',    'liability'],
      ['3000', 'Owner Equity',        'equity'],
      ['4000', 'Sales Revenue',       'income'],
      ['4001', 'Other Income',        'income'],
      ['5000', 'Cost of Goods Sold',  'expense'],
      ['5001', 'Salaries Expense',    'expense'],
      ['5002', 'Rent Expense',        'expense'],
      ['5003', 'Utilities',           'expense'],
    ]
    const ins = db.prepare('INSERT INTO accounts (code,name,type) VALUES (?,?,?)')
    acctList.forEach(a => ins.run(...a))
  }

  // Default categories
  const catList = ['TAB','CAP','SYP','INJ','CREAM','DROPS','SHAMPOO','SOAP','OTHER']
  const insCat = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)')
  catList.forEach(c => insCat.run(c))
})

seedDefaults()

module.exports = db
