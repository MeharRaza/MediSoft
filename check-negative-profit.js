// Check why profit is negative
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'medisoft.db');
const db = Database(dbPath);

console.log('\n🔍 ANALYZING NEGATIVE PROFIT ISSUE\n');

const today = new Date().toISOString().split('T')[0];
console.log('📅 Date:', today);

// Get all sales today with detailed breakdown
const sales = db.prepare(`
  SELECT 
    s.id as sale_id,
    s.invoice_no,
    s.sub_total,
    s.discount_percent,
    s.discount_flat,
    s.grand_total,
    si.id as item_id,
    si.qty,
    si.sale_price,
    si.total as item_total,
    si.purchase_item_id,
    p.name as product_name,
    p.pcs_in_pack,
    pi.purchase_price,
    pi.pcs_in_pack as pi_pcs_in_pack
  FROM sales s
  JOIN sale_items si ON si.sale_id = s.id
  LEFT JOIN products p ON p.id = si.product_id
  LEFT JOIN purchase_items pi ON pi.id = si.purchase_item_id
  WHERE date(s.created_at) = ? AND s.status != 'voided'
  ORDER BY s.id DESC
`).all(today);

console.log(`\n📊 Found ${sales.length} sale items today\n`);
console.log('='.repeat(80));

let totalProfit = 0;
let totalRevenue = 0;
let totalCost = 0;

sales.forEach((item, index) => {
  console.log(`\n[${index + 1}] Invoice: ${item.invoice_no} (Sale ID: ${item.sale_id})`);
  console.log(`Product: ${item.product_name}`);
  console.log(`Quantity: ${item.qty} pcs`);
  
  // Revenue calculation
  const actualRevenue = (item.item_total / item.sub_total) * item.grand_total;
  console.log(`\n💰 REVENUE:`);
  console.log(`   Item total: ${item.item_total}`);
  console.log(`   Sub total: ${item.sub_total}`);
  console.log(`   Grand total: ${item.grand_total}`);
  console.log(`   Actual Revenue = (${item.item_total} / ${item.sub_total}) × ${item.grand_total} = ${actualRevenue.toFixed(2)}`);
  
  // Cost calculation
  console.log(`\n💸 COST:`);
  if (item.purchase_item_id && item.purchase_price) {
    const pcsInPack = item.pi_pcs_in_pack || 1;
    const costPerPiece = item.purchase_price / pcsInPack;
    const totalCostForItem = costPerPiece * item.qty;
    
    console.log(`   Purchase price (per box): ${item.purchase_price}`);
    console.log(`   Pcs in pack: ${pcsInPack}`);
    console.log(`   Cost per piece: ${costPerPiece.toFixed(2)}`);
    console.log(`   Total cost = ${costPerPiece.toFixed(2)} × ${item.qty} = ${totalCostForItem.toFixed(2)}`);
    
    // Profit
    const profit = actualRevenue - totalCostForItem;
    console.log(`\n📈 PROFIT: ${actualRevenue.toFixed(2)} - ${totalCostForItem.toFixed(2)} = ${profit.toFixed(2)}`);
    
    totalProfit += profit;
    totalRevenue += actualRevenue;
    totalCost += totalCostForItem;
  } else {
    console.log(`   ⚠️  NO PURCHASE DATA!`);
    console.log(`   purchase_item_id: ${item.purchase_item_id || 'NULL'}`);
    console.log(`   purchase_price: ${item.purchase_price || 'NULL'}`);
    console.log(`   Cannot calculate profit without purchase price!`);
  }
  
  console.log('-'.repeat(80));
});

console.log('\n' + '='.repeat(80));
console.log('\n📊 SUMMARY:');
console.log(`Total Revenue: PKR ${totalRevenue.toFixed(2)}`);
console.log(`Total Cost: PKR ${totalCost.toFixed(2)}`);
console.log(`\n💰 TOTAL PROFIT: PKR ${totalProfit.toFixed(2)}`);
console.log('\n' + '='.repeat(80));

// Check for issues
console.log('\n🔍 POTENTIAL ISSUES:\n');

// Issue 1: Items without purchase_item_id
const noPurchaseItems = sales.filter(s => !s.purchase_item_id);
if (noPurchaseItems.length > 0) {
  console.log(`⚠️  ${noPurchaseItems.length} items have NO purchase_item_id`);
  noPurchaseItems.forEach(item => {
    console.log(`   - ${item.product_name} (Invoice: ${item.invoice_no})`);
  });
}

// Issue 2: Items where sale price < purchase price
const losingItems = sales.filter(s => {
  if (!s.purchase_price) return false;
  const pcsInPack = s.pi_pcs_in_pack || 1;
  const costPerPiece = s.purchase_price / pcsInPack;
  const salePerPiece = s.sale_price / (s.pcs_in_pack || 1);
  return salePerPiece < costPerPiece;
});

if (losingItems.length > 0) {
  console.log(`\n❌ ${losingItems.length} items sold at LOSS (sale < purchase):`);
  losingItems.forEach(item => {
    const pcsInPack = item.pi_pcs_in_pack || 1;
    const costPerPiece = item.purchase_price / pcsInPack;
    const salePerPiece = item.sale_price / (item.pcs_in_pack || 1);
    console.log(`   - ${item.product_name}`);
    console.log(`     Sale: ${salePerPiece.toFixed(2)}/pc, Purchase: ${costPerPiece.toFixed(2)}/pc`);
    console.log(`     Loss per piece: ${(costPerPiece - salePerPiece).toFixed(2)}`);
  });
}

// Issue 3: Over-sold batches
console.log('\n🔍 Checking for over-sold batches...\n');
const overSold = db.prepare(`
  SELECT id, product_id, qty, qty_sold, (qty_sold - qty) as excess
  FROM purchase_items
  WHERE qty_sold > qty
`).all();

if (overSold.length > 0) {
  console.log(`⚠️  ${overSold.length} batches have qty_sold > qty:`);
  overSold.forEach(batch => {
    const product = db.prepare('SELECT name FROM products WHERE id = ?').get(batch.product_id);
    console.log(`   - Batch ${batch.id}: ${product?.name || 'Unknown'}`);
    console.log(`     Qty: ${batch.qty}, Sold: ${batch.qty_sold}, Excess: ${batch.excess}`);
  });
}

console.log('\n');
