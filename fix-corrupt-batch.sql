-- Find the corrupt batch (purchase_item ID 30)
SELECT 
  pi.id,
  p.name as product_name,
  pi.qty,
  pi.qty_sold,
  pi.purchase_price as corrupt_price,
  pi.sale_price,
  pu.created_at
FROM purchase_items pi
JOIN products p ON p.id = pi.product_id
JOIN purchases pu ON pu.id = pi.purchase_id
WHERE pi.id = 30;

-- Update the corrupt batch with correct per-box price
-- If it was 400 per pill and 10 pills in box, correct per-box price should be around 335.75 (like other batches)
UPDATE purchase_items 
SET purchase_price = 335.75,
    sale_price = 400
WHERE id = 30;

-- Verify the fix
SELECT 
  pi.id,
  p.name as product_name,
  pi.qty,
  pi.qty_sold,
  pi.purchase_price as fixed_price,
  pi.sale_price,
  pu.created_at
FROM purchase_items pi
JOIN products p ON p.id = pi.product_id
JOIN purchases pu ON pu.id = pi.purchase_id
WHERE pi.id = 30;
