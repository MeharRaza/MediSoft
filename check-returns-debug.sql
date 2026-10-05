-- Debug script to check returns and profit calculation
.mode column
.headers on

SELECT '=== TODAY SALES ===' as info;
SELECT 
  s.id,
  s.invoice_no,
  s.grand_total,
  COUNT(si.id) as items
FROM sales s
LEFT JOIN sale_items si ON si.sale_id = s.id
WHERE date(s.created_at) = date('now', 'localtime')
GROUP BY s.id;

SELECT '' as info;
SELECT '=== TODAY RETURNS ===' as info;
SELECT 
  sr.id,
  sr.sale_id,
  sr.total as return_amount,
  COUNT(sri.id) as items
FROM sale_returns sr
LEFT JOIN sale_return_items sri ON sri.return_id = sr.id
WHERE date(sr.created_at) = date('now', 'localtime')
GROUP BY sr.id;

SELECT '' as info;
SELECT '=== RETURN ITEMS WITH PURCHASE_ITEM_ID ===' as info;
SELECT 
  sri.return_id,
  sri.product_id,
  p.name as product,
  sri.qty,
  sri.price,
  sri.purchase_item_id,
  CASE WHEN sri.purchase_item_id IS NULL THEN 'NULL ❌' ELSE 'OK ✓' END as status
FROM sale_return_items sri
JOIN sale_returns sr ON sr.id = sri.return_id
JOIN products p ON p.id = sri.product_id
WHERE date(sr.created_at) = date('now', 'localtime');

SELECT '' as info;
SELECT '=== SOLD COGS (Cost of goods sold) ===' as info;
SELECT 
  SUM(si.qty * COALESCE((pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END), 0)) as sold_cogs
FROM sale_items si 
JOIN sales s ON s.id = si.sale_id 
LEFT JOIN purchase_items pi ON pi.id = si.purchase_item_id
WHERE date(s.created_at) = date('now', 'localtime') AND s.status != 'voided';

SELECT '' as info;
SELECT '=== RETURNED COGS (Should be subtracted) ===' as info;
SELECT 
  SUM(sri.qty * COALESCE((pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END), 0)) as returned_cogs
FROM sale_return_items sri
JOIN sale_returns sr ON sr.id = sri.return_id
LEFT JOIN purchase_items pi ON pi.id = sri.purchase_item_id
WHERE date(sr.created_at) = date('now', 'localtime');

SELECT '' as info;
SELECT '=== DETAILED BREAKDOWN ===' as info;
SELECT 
  p.name as product,
  sri.qty as returned_qty,
  sri.price as sale_price,
  sri.purchase_item_id,
  pi.purchase_price as pack_purchase_price,
  pi.pcs_in_pack,
  ROUND(pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END, 2) as per_piece_cost,
  ROUND(sri.qty * (pi.purchase_price / CASE WHEN pi.pcs_in_pack IS NULL OR pi.pcs_in_pack = 0 THEN 1 ELSE pi.pcs_in_pack END), 2) as item_cogs
FROM sale_return_items sri
JOIN sale_returns sr ON sr.id = sri.return_id
JOIN products p ON p.id = sri.product_id
LEFT JOIN purchase_items pi ON pi.id = sri.purchase_item_id
WHERE date(sr.created_at) = date('now', 'localtime');
