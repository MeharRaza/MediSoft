-- Find Bisleri Product ID
SELECT '=== BISLERI PRODUCT ===' as info;
SELECT id, name, pcs_in_pack FROM products WHERE LOWER(name) LIKE '%bisleri%';

-- Purchase Items
SELECT '=== PURCHASE ITEMS ===' as info;
SELECT 
  pi.id,
  pi.qty as purchased,
  IFNULL(pi.qty_sold, 0) as qty_sold,
  (pi.qty - IFNULL(pi.qty_sold, 0)) as remaining,
  pi.expiry_date,
  pu.invoice_no,
  pu.created_at
FROM purchase_items pi
JOIN purchases pu ON pu.id = pi.purchase_id
WHERE pi.product_id = (SELECT id FROM products WHERE LOWER(name) LIKE '%bisleri%' LIMIT 1)
ORDER BY pu.created_at;

-- Sale Items
SELECT '=== SALE ITEMS ===' as info;
SELECT 
  si.id,
  si.qty as sold_qty,
  si.purchase_item_id,
  s.invoice_no,
  s.status,
  s.created_at
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE si.product_id = (SELECT id FROM products WHERE LOWER(name) LIKE '%bisleri%' LIMIT 1)
ORDER BY s.created_at;

-- Returns
SELECT '=== RETURNS ===' as info;
SELECT 
  sri.qty as returned_qty,
  sri.purchase_item_id,
  sr.created_at
FROM sale_return_items sri
JOIN sale_returns sr ON sr.id = sri.return_id
WHERE sri.product_id = (SELECT id FROM products WHERE LOWER(name) LIKE '%bisleri%' LIMIT 1);

-- Summary
SELECT '=== SUMMARY ===' as info;
SELECT 
  'Total Purchased' as metric,
  SUM(pi.qty) as value
FROM purchase_items pi
WHERE pi.product_id = (SELECT id FROM products WHERE LOWER(name) LIKE '%bisleri%' LIMIT 1)
UNION ALL
SELECT 
  'Total qty_sold in DB' as metric,
  SUM(IFNULL(pi.qty_sold, 0)) as value
FROM purchase_items pi
WHERE pi.product_id = (SELECT id FROM products WHERE LOWER(name) LIKE '%bisleri%' LIMIT 1)
UNION ALL
SELECT 
  'Total Sold (from sales)' as metric,
  SUM(si.qty) as value
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE si.product_id = (SELECT id FROM products WHERE LOWER(name) LIKE '%bisleri%' LIMIT 1)
  AND s.status != 'voided'
UNION ALL
SELECT 
  'Total Returned' as metric,
  IFNULL(SUM(sri.qty), 0) as value
FROM sale_return_items sri
WHERE sri.product_id = (SELECT id FROM products WHERE LOWER(name) LIKE '%bisleri%' LIMIT 1)
UNION ALL
SELECT 
  'Calculated Stock (Purchased - qty_sold)' as metric,
  SUM(pi.qty - IFNULL(pi.qty_sold, 0)) as value
FROM purchase_items pi
WHERE pi.product_id = (SELECT id FROM products WHERE LOWER(name) LIKE '%bisleri%' LIMIT 1);
