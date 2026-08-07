const Database = require('better-sqlite3');
const db = new Database('./data/medisoft.db');

console.log('\n🔍 CHECKING TODAY\'S SALES FOR NEGATIVE PROFIT\n');

// Get today's date
const today = new Date().toISOString().split('T')[0];
console.log('Date:', today);

// Get all sales today
const sales = db.prepare(`
  SELECT 
    s.id, s.invoice_no, s.sub_total, s.discount_percent, s.discount_flat, s.grand_total,
    si.id as item_id, si.qty, si.price, si.discount as item_discount, si.total as item_total,
    pi.purchase_price, pi.pcs_in_pack,
    p.name as product_name
  FROM sales s
  JOIN sale_items si ON si.sale_id = s.id
  LEFT JOIN purchase_items pi ON pi.id = si.purchase_item_id
  LEFT JOIN products p ON p.id = si.product_id
  WHERE date(s.created_at) = ? AND s.status != 'voided'
`).all(today);

console.log(`\nFound ${sales.length} sale items today\n`);

let totalProfit = 0;

sales.forEach(item => {
  // Calculate actual revenue after all discounts
  const actualRevenue = (item.item_total / item.sub_total) * item.grand_total;
  
  // Calculate cost
  const pcsInPack = item.pcs_in_pack || 1;
  const costPerPiece = item.purchase_price / pcsInPack;
  const totalCost = costPerPiece * item.qty;
  
  // Calculate profit
  const profit = actualRevenue - totalCost;
  totalProfit += profit;
  
  console.log(`Invoice: ${item.invoice_no}`);
  console.log(`Product: ${item.product_name}`);
  console.log(`Qty: ${item.qty} pcs`);
  console.log(`Price per box: ${item.price}`);
  console.log(`Item total: ${item.item_total}`);
  console.log(`Sale sub_total: ${item.sub_total}`);
  console.log(`Sale grand_total: ${item.grand_total}`);
  console.log(`Actual Revenue: ${actualRevenue.toFixed(2)}`);
  console.log(`Purchase price (per box): ${item.purchase_price || 'NULL'}`);
  console.log(`Pcs in pack: ${pcsInPack}`);
  console.log(`Cost per piece: ${costPerPiece}`);
  console.log(`Total cost: ${totalCost.toFixed(2)}`);
  console.log(`PROFIT: ${profit.toFixed(2)}`);
  console.log('---');
});

console.log(`\n💰 TOTAL PROFIT: PKR ${totalProfit.toFixed(2)}\n`);

db.close();
