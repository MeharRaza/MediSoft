-- View batch 30 details
.mode column
.headers on

SELECT 'BEFORE FIX:' as status;
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
WHERE pi.id = 30;

-- Fix: Divide by pcs_in_pack (10) to get correct per-box price
UPDATE purchase_items 
SET purchase_price = ROUND(purchase_price / 10.0, 2),
    sale_price = ROUND(sale_price / 10.0, 2)
WHERE id = 30 AND purchase_price > 1000;

SELECT 'AFTER FIX:' as status;
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
WHERE pi.id = 30;
