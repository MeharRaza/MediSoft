// Fix corrupt batch data from old per-pill/per-box confusion
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'medisoft.db');
const db = Database(dbPath);

console.log('\n🔧 FIXING CORRUPT BATCH DATA\n');

// Find batches with abnormally high purchase_price
const suspiciousBatches = db.prepare(`
  SELECT 
    pi.id,
    p.name as product_name,
    pi.qty,
    pi.qty_sold,
    pi.purchase_price,
    pi.sale_price,
    p.pcs_in_pack,
    pu.created_at
  FROM purchase_items pi
  JOIN products p ON p.id = pi.product_id
  JOIN purchases pu ON pu.id = pi.purchase_id
  WHERE pi.purchase_price > 1000
  ORDER BY pi.purchase_price DESC
`).all();

console.log(`Found ${suspiciousBatches.length} batches with purchase_price > 1000:\n`);

suspiciousBatches.forEach(batch => {
  console.log(`Batch ID: ${batch.id}`);
  console.log(`Product: ${batch.product_name}`);
  console.log(`Purchase Price: ${batch.purchase_price} (per box)`);
  console.log(`Sale Price: ${batch.sale_price} (per box)`);
  console.log(`Pcs in pack: ${batch.pcs_in_pack}`);
  console.log(`Qty: ${batch.qty}, Sold: ${batch.qty_sold}`);
  console.log(`Created: ${batch.created_at}`);
  
  // Calculate what the correct per-box price should be
  // If it was entered as per-pill, divide by pcs_in_pack
  const correctedPurchasePrice = batch.purchase_price / (batch.pcs_in_pack || 1);
  const correctedSalePrice = batch.sale_price / (batch.pcs_in_pack || 1);
  
  console.log(`\n💡 Suggested Fix:`);
  console.log(`   Purchase Price: ${batch.purchase_price} → ${correctedPurchasePrice.toFixed(2)}`);
  console.log(`   Sale Price: ${batch.sale_price} → ${correctedSalePrice.toFixed(2)}`);
  
  // Apply the fix
  const result = db.prepare(`
    UPDATE purchase_items 
    SET purchase_price = ?,
        sale_price = ?
    WHERE id = ?
  `).run(correctedPurchasePrice, correctedSalePrice, batch.id);
  
  console.log(`✅ Fixed! (Changes: ${result.changes})\n`);
  console.log('-'.repeat(80));
});

if (suspiciousBatches.length === 0) {
  console.log('✅ No corrupt batches found!\n');
}

// Also update the parent purchase total if needed
console.log('\n🔍 Checking if parent purchases need updating...\n');

const affectedPurchases = db.prepare(`
  SELECT DISTINCT pu.id, pu.grand_total
  FROM purchases pu
  JOIN purchase_items pi ON pi.purchase_id = pu.id
  WHERE pi.id IN (${suspiciousBatches.map(b => b.id).join(',') || '0'})
`).all();

affectedPurchases.forEach(purchase => {
  // Recalculate grand_total from purchase_items
  const correctTotal = db.prepare(`
    SELECT SUM(purchase_price * qty) as total
    FROM purchase_items
    WHERE purchase_id = ?
  `).get(purchase.id);
  
  console.log(`Purchase ID: ${purchase.id}`);
  console.log(`Old total: ${purchase.grand_total}`);
  console.log(`New total: ${correctTotal.total}`);
  
  db.prepare(`UPDATE purchases SET grand_total = ? WHERE id = ?`)
    .run(correctTotal.total, purchase.id);
  
  console.log(`✅ Updated!\n`);
});

console.log('\n✅ ALL FIXES APPLIED!\n');

db.close();
