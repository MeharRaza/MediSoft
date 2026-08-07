// Quick fix for batch 30
const betterSqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'medisoft.db');
console.log('Opening database:', dbPath);

const db = betterSqlite3(dbPath);

console.log('\n🔍 Checking batch 30...\n');

const before = db.prepare(`
  SELECT 
    pi.id,
    p.name,
    p.pcs_in_pack,
    pi.purchase_price,
    pi.sale_price,
    pi.qty,
    pi.qty_sold
  FROM purchase_items pi
  JOIN products p ON p.id = pi.product_id
  WHERE pi.id = 30
`).get();

console.log('BEFORE FIX:');
console.log(before);

if (before && before.purchase_price > 1000) {
  console.log('\n🔧 Fixing corrupt data (dividing by pcs_in_pack)...\n');
  
  const newPurchasePrice = Math.round((before.purchase_price / before.pcs_in_pack) * 100) / 100;
  const newSalePrice = Math.round((before.sale_price / before.pcs_in_pack) * 100) / 100;
  
  const result = db.prepare(`
    UPDATE purchase_items 
    SET purchase_price = ?,
        sale_price = ?
    WHERE id = 30
  `).run(newPurchasePrice, newSalePrice);
  
  console.log(`Updated ${result.changes} row(s)`);
  
  const after = db.prepare(`
    SELECT 
      pi.id,
      p.name,
      p.pcs_in_pack,
      pi.purchase_price,
      pi.sale_price,
      pi.qty,
      pi.qty_sold
    FROM purchase_items pi
    JOIN products p ON p.id = pi.product_id
    WHERE pi.id = 30
  `).get();
  
  console.log('\nAFTER FIX:');
  console.log(after);
  console.log('\n✅ Fix applied successfully!\n');
} else {
  console.log('\n✅ No fix needed - batch is already correct!\n');
}

db.close();
