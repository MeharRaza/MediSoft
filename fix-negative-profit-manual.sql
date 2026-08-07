-- =====================================================
-- MANUAL FIX FOR NEGATIVE PROFIT ISSUE
-- =====================================================
-- Problem: Migration 9 ran multiple times and divided 
--          prices repeatedly, causing negative profit
-- 
-- Solution: You need to manually correct the affected
--           batches by updating their prices
-- =====================================================

-- Step 1: Find all batches with very low prices (likely affected)
SELECT 
  pi.id as batch_id,
  p.id as product_id,
  p.name as product_name,
  p.pcs_in_pack,
  pi.purchase_price as current_purchase_price,
  pi.sale_price as current_sale_price,
  pi.qty,
  pi.qty_sold,
  pi.expiry_date
FROM purchase_items pi
JOIN products p ON p.id = pi.product_id
WHERE pi.purchase_price < 100 OR pi.sale_price < 100
ORDER BY p.name;

-- Step 2: Manually check each batch and update with correct prices
-- Example: If a batch was divided twice (divided by 10 each time)
-- You need to multiply by 100 to get back to original

-- UPDATE purchase_items 
-- SET purchase_price = purchase_price * 100,
--     sale_price = sale_price * 100
-- WHERE id = <batch_id>;

-- Step 3: Recalculate profit_percent for fixed batches
-- UPDATE purchase_items
-- SET profit_percent = ((sale_price - purchase_price) / sale_price) * 100
-- WHERE id = <batch_id>;

-- =====================================================
-- ALTERNATIVE: Delete affected batches and re-enter
-- =====================================================
-- If you can't figure out the correct prices, it might
-- be easier to delete the affected batches and create
-- new purchase entries with correct prices

-- DELETE FROM purchase_items WHERE id = <batch_id>;

-- =====================================================
-- PREVENTION FOR FUTURE
-- =====================================================
-- Migration 9 has been REMOVED from database.js
-- It will no longer run on app startup
-- New version: v1.3.10 will have this fix
